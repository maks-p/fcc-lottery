import { ethers } from 'ethers';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { developmentChains } from '../helper-hardhat-config';

const BASE_FEE = ethers.utils.parseEther('0.25'); // 0.25 LINK per request
const GAS_PRICE_LINK = 1e9;

const deployMocks: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	// @ts-ignore
	const { deployments, getNamedAccounts, network } = hre;
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();

	if (developmentChains.includes(network.name)) {
		log('Local network detected! Deploying mocks...');
		await deploy('VRFCoordinatorV2Mock', {
			from: deployer,
			log: true,
			args: [BASE_FEE, GAS_PRICE_LINK],
		});

		log('Mocks Deployed!');
		log('----------------------------------');

		log(
			'You are deploying to a local network - you will need a local network running to interact with this contract:'
		);
		log(
			'Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!'
		);
		log('----------------------------------');
	}
};
export default deployMocks;
deployMocks.tags = ['all', 'mocks'];
