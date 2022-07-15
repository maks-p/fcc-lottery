import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { assert, expect } from 'chai';
import { BigNumber } from 'ethers';
import { network, ethers, getNamedAccounts, deployments } from 'hardhat';
import { developmentChains, networkConfig } from '../../helper-hardhat-config';
import { Raffle, VRFCoordinatorV2Mock } from '../../typechain-types';

!developmentChains.includes(network.name)
	? describe.skip
	: describe('Raffle Unit Tests', () => {
			let raffle: Raffle, vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
			let raffleEntranceFee: BigNumber;
			let interval: number;
			let deployer: string;
			let player: SignerWithAddress;

			const networkName = network.name;

			beforeEach(async () => {
				// Get deployer from Named Accounts
				deployer = (await getNamedAccounts()).deployer;

				// Get Player from Named Accounts (returns address)
				const playerAddress = (await getNamedAccounts()).player;

				// Create a Signer from the Address
				player = await ethers.getSigner(playerAddress);

				await deployments.fixture(['all']);
				raffle = await ethers.getContract('Raffle', deployer);
				vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer);
				raffleEntranceFee = await raffle.getEntranceFee();
				interval = (await raffle.getInterval()).toNumber();
			});

			describe('Constructor', () => {
				it('Initializes the Raffle correctly', async () => {
					const raffleState = await raffle.getRaffleState();
					assert.equal(raffleState.toString(), '0');

					const raffleInterval = await raffle.getInterval();
					assert.equal(
						raffleInterval.toString(),
						networkName && networkConfig[networkName]['raffleInterval']
					);
				});
			});

			describe('Enter Raffle', () => {
				it("Reverts when you don't pay enough Ether", async () => {
					await expect(raffle.enterRaffle()).to.be.revertedWith('Raffle__InsufficientEntranceFee');
				});

				it('Records player when they enter', async () => {
					await raffle.connect(player).enterRaffle({ value: raffleEntranceFee });
					const rafflePlayer = await raffle.getPlayer(0);
					assert.equal(player.address, rafflePlayer);
				});

				it('Emits event on enter', async () => {
					await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
						raffle,
						'RaffleEnter'
					);
				});

				it('Reverts when raffle entrance attempted while raffle calculating', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send('evm_increaseTime', [interval + 1]);
					await network.provider.send('evm_mine', []);

					// Pretend to be a keeper
					await raffle.performUpkeep([]);
					await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
						'Raffle__RaffleNotOpen'
					);
				});
			});

			describe('checkUpkeep', () => {
				it("Returns false if people haven't sent any ETH", async () => {
					await network.provider.send('evm_increaseTime', [interval + 1]);
					await network.provider.send('evm_mine', []);

					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
					assert(!upkeepNeeded);
				});

				it("Returns false if raffle isn't open", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send('evm_increaseTime', [interval + 1]);
					await network.provider.send('evm_mine', []);
					await raffle.performUpkeep('0x');
					const raffleState = await raffle.getRaffleState();
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
					assert.equal(raffleState.toString(), '1');
					assert.equal(upkeepNeeded, false);
				});

				it("Returns false if enough time hasn't passed", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send('evm_increaseTime', [interval - 1]);
					await network.provider.send('evm_mine', []);
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep('0x');
					assert(!upkeepNeeded);
				});

				it('Returns true if enough time has passed, has players, eth, and is open', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send('evm_increaseTime', [interval + 1]);
					await network.provider.send('evm_mine', []);
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep('0x');
					assert(upkeepNeeded);
				});
			});

			describe('performUpkeep', () => {
				it('Can only run if checkUpkeep is true', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send('evm_increaseTime', [interval + 1]);
					await network.provider.send('evm_mine', []);

					const tx = await raffle.performUpkeep('0x');
					assert(tx);
				});

				it('Reverts when checkUpkeep is false', async () => {
					await expect(raffle.performUpkeep('0x')).to.be.revertedWith('Raffle__UpkeepNotNeeded');
				});

				it('Updates the raffle state, emits an event, and calls the VRF Coordinator', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send('evm_increaseTime', [interval + 1]);
					await network.provider.send('evm_mine', []);

					const tx = await raffle.performUpkeep([]);
					const txReceipt = await tx.wait(1);

					const requestId = txReceipt!.events![1].args!.requestId;
					const raffleState = await raffle.getRaffleState();

					assert(requestId.toNumber() > 0);
					assert(raffleState == 1);
				});
			});

			describe('fulfillRandomWords', () => {
				beforeEach(async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send('evm_increaseTime', [interval + 1]);
					await network.provider.send('evm_mine', []);
				});

				it('Can only be called after performUpkeep', async () => {
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
					).to.be.revertedWith('nonexistent request');
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
					).to.be.revertedWith('nonexistent request');
				});

				it('Picks a winner, resets the lottery, and sends money', async () => {
					const additionalEntrants = 3;
					const startingAccountIdx = 2;
					const accounts = await ethers.getSigners();

					for (let i = startingAccountIdx; i < startingAccountIdx + additionalEntrants; i++) {
						const accountConnectedRaffle = raffle.connect(accounts[i]);
						await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
					}

					const startingTimestamp = await raffle.getLastTimestamp();

					await new Promise<void>(async (resolve, reject) => {
						raffle.once('WinnerPicked', async () => {
							console.log('Event fired!');
							try {
								const recentWinner = await raffle.getRecentWinner();
								const raffleState = await raffle.getRaffleState();
								const winnerBalance = await accounts[2].getBalance();
								const endingTimeStamp = await raffle.getLastTimestamp();
								await expect(raffle.getPlayer(0)).to.be.reverted;
								assert.equal(recentWinner.toString(), accounts[2].address);
								assert.equal(raffleState, 0);
								assert.equal(
									winnerBalance.toString(),
									startingBalance
										.add(raffleEntranceFee.mul(additionalEntrants).add(raffleEntranceFee))
										.toString()
								);
								assert(endingTimeStamp > startingTimestamp);
							} catch (e) {
								reject(e);
							}
							resolve();
						});
						const tx = await raffle.performUpkeep([]);
						const txReceipt = await tx.wait(1);
						const startingBalance = await accounts[2].getBalance();
						await vrfCoordinatorV2Mock.fulfillRandomWords(
							txReceipt!.events![1].args!.requestId,
							raffle.address
						);
					});
				});
			});
	  });
