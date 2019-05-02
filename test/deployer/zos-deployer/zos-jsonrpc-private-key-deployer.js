const etherlime = require('./../../../index.js');
const ethers = require('ethers');
let chai = require("chai");
const assert = require('chai').assert;
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const fs = require('fs-extra');
const isAddress = require('../../../utils/address-utils').isAddress;

const ganacheSetupConfig = require('../../../cli-commands/ganache/setup');
const compiler = require('../../../cli-commands/compiler/compiler')
const config = require('./../../config.json');

const upgradedContract = require('./contracts/ZosContractUpgraded').upgradedContract

const defaultConfigs = {
	gasPrice: config.defaultGasPrice,
	gasLimit: config.defaultGasLimit
}

let contractInstance;
let proxyInstance;
let deployer;
let signer;
let notAdmin;
let ZosContract;
let LimeFactory;
let currentDir;


describe('Zos deployer tests', async () => {

	describe('deploy proxy', async () => {

		before(async function() {
			currentDir = process.cwd();
			process.chdir('./test/deployer/zos-deployer')
			await compiler.run('.')
			ZosContract = JSON.parse(fs.readFileSync('./build/ZosContract.json'));
			deployer = new etherlime.ZosJSONRPCPrivateKeyDeployer(config.randomPrivateKey, config.nodeUrl, defaultConfigs);
			signer = deployer.signer
			notAdmin = new ethers.Wallet(ganacheSetupConfig.accounts[5].secretKey, deployer.provider);
		})
	
		it('should deploy contract with init method correctly', async () => {
			contractInstance = await deployer.deploy(ZosContract, 10);
			
			assert.ok(isAddress(contractInstance.contractAddress), 'The deployed address is incorrect');
			assert.deepEqual(signer.address, contractInstance.signer.address, "The stored signer does not match the inputted one");
			assert.deepEqual(config.nodeUrl, contractInstance.provider.connection.url, "The stored provider does not match the inputted one");
	
		});

		it('should have json file created with proxy instance data', async () => {
			assert.ok(fs.existsSync('./proxy.json'))
			proxyInstance = JSON.parse(fs.readFileSync('./proxy.json'))
			let proxyAddress = proxyInstance[ZosContract.contractName].address
			assert.deepEqual(proxyAddress, contractInstance.contractAddress)
		})
	
		it('should read value from the contract', async () => {
			let instance = await contractInstance.contract.connect(notAdmin)
			let value = await instance.num()
			assert.equal(value.toNumber(), 10)
		})
	
		it('should not find a specific function before upgrading', async () => {
			const throwingFunction = () => {
				contractInstance.newFunction()
			}
			assert.throws(throwingFunction, "contractInstance.newFunction is not a function", "The contract not throw if specific function is called before upgrading");
		})
	
		it('should update contract correctly', async () => {
			let zosContractInitial = fs.readFileSync('./contracts/ZosContract.sol')
			fs.writeFileSync('./contracts/ZosContract.sol', upgradedContract)
			fs.removeSync('./build')
			await compiler.run('.')
			ZosContract = JSON.parse(fs.readFileSync('./build/ZosContract.json'));
			let contractAddressBeforeUpgrading = contractInstance.contractAddress;
			contractInstance = await deployer.deploy(ZosContract);
			assert.ok(isAddress(contractInstance.contractAddress), 'The deployed address is incorrect');
			assert.equal(contractInstance.contractAddress, contractAddressBeforeUpgrading)
			fs.writeFileSync('./contracts/ZosContract.sol', zosContractInitial)
		})
	
		// it('should execute a specific function after upgrading', async () => {
		// 	let instance = await contractInstance.contract.connect(notAdmin)
		// 	// await instance.newFunction(5)
		// 	let value = await instance.num()
		// 	assert.equal(value.toNumber(), 15, "The value is not updated after newFunction execution")
		// })

		it('should add new proxy to proxy.json', async () => {
			LimeFactory = JSON.parse(fs.readFileSync('./build/LimeFactory.json'));
			contractInstance = await deployer.deploy(LimeFactory);
			
			assert.ok(isAddress(contractInstance.contractAddress), 'The deployed address is incorrect');
			assert.deepEqual(signer.address, contractInstance.signer.address, "The stored signer does not match the inputted one");
			assert.deepEqual(config.nodeUrl, contractInstance.provider.connection.url, "The stored provider does not match the inputted one");

			proxyInstance = JSON.parse(fs.readFileSync('./proxy.json'))
			let proxyAddress = proxyInstance[LimeFactory.contractName].address
			assert.deepEqual(proxyAddress, contractInstance.contractAddress)
	
		})

		it.only('should deploy on ropsten test net', async () => {
			LimeFactory = JSON.parse(fs.readFileSync('./build/LimeFactory.json'));
			let walletPK = '9C854BD14857DD1F107ECB94E1AEEAA8E9538E3DC41D082D5FE0E452E87A2F28'
			let infuraURL = 'https://ropsten.infura.io/ede61953adb34beeb5106a2c0c61f200'
			deployer = new etherlime.ZosJSONRPCPrivateKeyDeployer(walletPK, infuraURL, defaultConfigs);
			contractInstance = await deployer.deploy(LimeFactory)
			console.log("contractinst", contractInstance.contractAddress)
		})

		// it('should override data in json file if we want to deploy on different network', async() => {
		// 	deployer = new etherlime.ZosJSONRPCPrivateKeyDeployer(config.randomPrivateKey, config.alternativeNodeUrl, defaultConfigs);
		// 	let addressBefore = contractInstance.contractAddress
		// 	contractInstance = await deployer.deploy(LimeFactory);
		// 	proxyInstance = JSON.parse(fs.readFileSync('./proxy.json'))
		// 	let proxyAddress = proxyInstance[LimeFactory.contractName].address
		// 	assert.notDeepEqual(proxyAddress, addressBefore)
		// })


		// it('should return undefined contract instance if transaction failed', async () => {
		// 	await assert.isRejected(deployer.deploy(ZosContractUpgraded, "param to fail"), "failed");
		// })

		after(async() => {
			fs.removeSync('./proxy.json')
			fs.removeSync('./build')
			process.chdir(currentDir)
		})

	})

})