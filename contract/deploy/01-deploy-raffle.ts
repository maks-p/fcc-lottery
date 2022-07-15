import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { developmentChains, networkConfig } from '../helper-hardhat-config';
import verify from '../utils/verify';

const deployContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	// @ts-ignore
	const { getNamedAccounts, deployments, network, ethers } = hre;
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();
	const networkName = network.name;

	let vrfCoordinatorV2Address, subscriptionId;
	const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('30');

	if (developmentChains.includes(network.name)) {
		const vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
		vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

		const txn = await vrfCoordinatorV2Mock.createSubscription();
		const txnReceipt = await txn.wait(1);
		subscriptionId = txnReceipt.events[0].args.subId;
		await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
	} else {
		vrfCoordinatorV2Address = networkName && networkConfig[networkName]['vrfCoordinatorV2'];
		subscriptionId = networkName && networkConfig[networkName]['subscriptionId'];
	}

	const raffleEntranceFee = networkName && networkConfig[networkName]['raffleEntranceFee'];
	const gasLane = networkName && networkConfig[networkName]['gasLane'];
	const callbackGasLimit = networkName && networkConfig[networkName]['callbackGasLimit'];
	const keepersUpdateInterval = networkName && networkConfig[networkName]['raffleInterval'];

	const args = [
		vrfCoordinatorV2Address,
		raffleEntranceFee,
		gasLane,
		subscriptionId,
		callbackGasLimit,
		keepersUpdateInterval,
	];

	const raffle = await deploy('Raffle', {
		from: deployer,
		args: args,
		log: true,
		waitConfirmations: 1,
	});

	if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		console.log('Verifying contract...');
		await verify(raffle.address, args);
	}
};

export default deployContract;
deployContract.tags = ['all', 'raffle'];
