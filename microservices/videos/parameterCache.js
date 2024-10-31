const Memcached = require("memjs");
const util = require("util");
const AWS = require("aws-sdk");

// Initialize AWS SSM (Parameter Store)
const ssm = new AWS.SSM({ region: "ap-southeast-2" });

// Memcached setup
const memcachedAddress = "n11780100.km2jzi.cfg.apse2.cache.amazonaws.com:11211";
let memcached = Memcached.Client.create(memcachedAddress);

// Promisify memcached methods for async usage
memcached.aGet = util.promisify(memcached.get);
memcached.aSet = util.promisify(memcached.set);

// Function to get parameters from AWS Parameter Store
async function getParameterFromStore(parameterName) {
    const params = { Name: parameterName };
    try {
        const data = await ssm.getParameter(params).promise();
        const parameterValue = data.Parameter.Value;
        console.log(`Parameter fetched from Parameter Store: ${parameterValue}`);
        return parameterValue;
    } catch (error) {
        console.error(`Error fetching parameter from Parameter Store: ${error}`);
        throw error;
    }
}

// Function to set cache in Memcached
async function setMemcache(parameterName, value) {
    try {
        await memcached.aSet(parameterName, value, { expires: 3600 });
        console.log(`Value cached successfully for key: ${parameterName}`);
    } catch (error) {
        console.error(`Error setting value in Memcached for key ${parameterName}: ${error}`);
    }
}

// Function to fetch and cache parameters
async function cacheParameters() {
    try {
        const userPoolId = await getParameterFromStore('/n11780100/cognito/pool_id');
        const clientId = await getParameterFromStore('/n11780100/cognito/pool_client_id');
        await setMemcache('userPoolId', userPoolId);
        await setMemcache('clientId', clientId);
        console.log('Parameters fetched and cached successfully!');
    } catch (error) {
        console.error('Error fetching and caching parameters:', error);
    }
}

module.exports = { getParameterFromStore };