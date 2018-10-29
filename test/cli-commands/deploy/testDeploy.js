const etherlime = require('./../../../index.js');

const ICOToken = require('../../testContracts/ICOToken.json')

const deploy = async (network, secret) => {

    const deployer = new etherlime.EtherlimeGanacheDeployer(secret);
    const contract = await deployer.deploy(ICOToken);
};

module.exports = {
    deploy
};