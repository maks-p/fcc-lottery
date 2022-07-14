import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { assert, expect } from 'chai';
import { BigNumber } from 'ethers';
import { network, ethers, getNamedAccounts, deployments } from 'hardhat';
import { developmentChains, networkConfig } from '../../helper-hardhat-config';
import { Raffle, VRFCoordinatorV2Mock } from '../../typechain-types';

developmentChains.includes(network.name)
	? describe.skip
	: describe('Raffle Staging Tests', () => {
			let raffle: Raffle;
			let raffleEntranceFee: BigNumber;
			let deployer: string;

			beforeEach(async () => {
				// Get deployer from Named Accounts
				deployer = (await getNamedAccounts()).deployer;

				raffle = await ethers.getContract('Raffle', deployer);
				raffleEntranceFee = await raffle.getEntranceFee();
			});

			describe('fulfillRandomWords', async () => {
				it('Works with live Chainlink Keepers and Chainlink VRF, gets a random winner', async () => {
					console.log('Setting up test...');
					const startingTimestamp = await raffle.getLastTimestamp();
					const accounts = await ethers.getSigners();

					console.log('Setting up Listener...');
					await new Promise<void>(async (resolve, reject) => {
						raffle.once('WinnerPicked', async () => {
							console.log('WinnerPicked event fired!');
							try {
								const recentWinner = await raffle.getRecentWinner();
								const raffleState = await raffle.getRaffleState();
								const winnerEndingBalance = await accounts[0].getBalance();
								const endingTimeStamp = await raffle.getLastTimestamp();

								await expect(raffle.getPlayer(0)).to.be.reverted;
								assert.equal(recentWinner.toString(), accounts[0].address);
								assert.equal(raffleState, 0);
								assert.equal(
									winnerEndingBalance.toString(),
									winnerStartingBalance.add(raffleEntranceFee).toString()
								);
								resolve();
							} catch (e) {
								console.log(e);
								reject(e);
							}
						});
						console.log('Entering Raffle...');
						await raffle.enterRaffle({ value: raffleEntranceFee });
						const winnerStartingBalance = await accounts[0].getBalance();
					});
				});
			});
	  });
