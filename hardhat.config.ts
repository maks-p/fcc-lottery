import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'dotenv/config';
import 'solidity-coverage';
import 'hardhat-deploy';
import { HardhatUserConfig } from 'hardhat/types';

const config: HardhatUserConfig = {
	solidity: {
		compilers: [
			{
				version: '0.8.9',
			},
			{
				version: '0.4.24',
			},
		],
	},
	defaultNetwork: 'hardhat',
	networks: {
		mainnet: {
			url: process.env.MAINNET_URL || '',
			accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
			saveDeployments: true,
		},
		rinkeby: {
			url: process.env.RINKEBY_URL || '',
			accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
			saveDeployments: true,
		},
		ropsten: {
			url: process.env.ROPSTEN_URL || '',
			accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
		},
		localhost: {
			url: 'http://127.0.0.1:8545',
			chainId: 31337,
		},
		hardhat: {
			// forking: {
			//   url: MAINNET_RPC_URL
			// }
			chainId: 31337,
		},
	},
	gasReporter: {
		enabled: true,
		currency: 'USD',
		outputFile: 'gas-report.txt',
		noColors: true,
		// coinmarketcap: process.env.COINMARKETCAP_API_KEY,
		// token: 'ETH',
	},
	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY,
	},
	namedAccounts: {
		deployer: {
			default: 0,
		},
		player: {
			default: 1,
		},
	},
	mocha: {
		timeout: 200000,
	},
};

export default config;
