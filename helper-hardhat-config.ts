import { ethers } from 'ethers';

export interface networkConfigItem {
	name?: string;
	subscriptionId?: string;
	gasLane?: string;
	raffleInterval?: string;
	raffleEntranceFee?: string;
	callbackGasLimit?: string;
	vrfCoordinatorV2?: string;
}

export interface networkConfigInfo {
	[key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
	hardhat: {
		name: 'hardhat',
		subscriptionId: '0',
		gasLane: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc', // 30 gwei
		raffleInterval: '30',
		raffleEntranceFee: ethers.utils.parseEther('0.01').toString(),
		callbackGasLimit: '500000', // 500,000 gas
	},
	rinkeby: {
		name: 'rinkeby',
		subscriptionId: '8458',
		gasLane: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc', // 30 gwei
		raffleInterval: '30',
		raffleEntranceFee: ethers.utils.parseEther('0.01').toString(),
		callbackGasLimit: '500000', // 500,000 gas
		vrfCoordinatorV2: '0x6168499c0cFfCaCD319c818142124B7A15E857ab',
	},
	mainnet: {
		name: 'mainnet',
		raffleInterval: '30',
	},
};

export const developmentChains = ['hardhat', 'localhost'];

export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
