import 'mocha';
import * as blockstack from "blockstack";
import * as utils from "../packages/utils";
import requestFixtures from './requestMocks/cruxclient-reqmocks';
import sinon from "sinon";
import WebCrypto from "node-webcrypto-ossl";
import { expect } from 'chai';
import {CruxClient, PayIDClaim} from "../index";
import { ErrorHelper, PackageErrorCode } from '../packages/error';

interface Global {
	crypto: any;
	TextEncoder: any;
	TextDecoder: any;
}
declare const global: Global;

const crypto = new WebCrypto();
let util = require('util')
global.crypto = crypto
global.TextEncoder = util.TextEncoder
global.TextDecoder = util.TextDecoder

describe('CruxClient tests', () => {

	let sampleAddressMap = {
		BTC: {
			addressHash: '1HX4KvtPdg9QUYwQE1kNqTAjmNaDG7w82V'
		},
		ETH: {
			addressHash: '0x0a2311594059b468c9897338b027c8782398b481'
		}
	};
	let mockedAddressMapping = {"1d6e1a99-1e77-41e1-9ebb-0e216faa166a": {addressHash: "19m51F8YkjzK625csaNtKnM9pgByeMJRU3"}}
	let sampleUser = {
		'payIDClaim': {"virtualAddress":"syedhassanashraf@cruxdev.crux","identitySecrets":"{\"iv\":\"XJmOCWeHzU4HfsYI\",\"encBuffer\":\"ss20WCh7PW64wWswkRUu/dxMkPro2KmD1rCGLKdtew82cPuJwZTqcdrfz9GBJOYqsHrzE4lOoUmODHeWor3ebC6vHCU8tQdg17Rlpdj3hx2FU0XTY1PsmJft4wZOvb9uThk6estvQgnj5/7quw9Be6oGt6gyCtOYsxtfSQysH0kfgRauCEOx4tTjSXO2GAufeEK4hubCC7bJ6iQCr9uAeMWRSxFknK8I+M62RnE8iINVp2yQ+5I3M7Z8oFRSzwi0nJAVps/rTMfZOw2mXYtgEgY59aSXItr+hHSGGF0pWHqlRNzcCbV11MdBCIrEHWhOnU/hK5PWSxJMRytIwEaYspXqWEu+KaftkKIxr/CU/rnCd8w/ML0lS7hMXljMG95BN66M8k5vXHkAmdmMRZdQN4Y4nD5vhxY0q69+37fH0LmsMG0tKdm3d4H8PVpu\"}"},
		'cruxID': 'syedhassanashraf@cruxdev.crux',
		'blockStackID': 'syedhassanashraf.crux.id',
		'cruxIDSubdomain': 'syedhassanashraf',
		'addressMapping': mockedAddressMapping
	}
	let walletOptions = {
		getEncryptionKey: () => "fookey",
		walletClientName: 'scatter_dev'
	}

	describe('after init tests', () => {

		let httpJSONRequestStub: sinon.SinonStub

		before(() => {
			httpJSONRequestStub = sinon.stub(utils, 'httpJSONRequest').throws('unhandled in mocks')
			
            requestFixtures.forEach(requestObj => {
              httpJSONRequestStub.withArgs(requestObj.request).returns(requestObj.response)
			});
		})

		after(() => {
			httpJSONRequestStub.restore()
			localStorage.clear();
		})

		describe('updatePassword tests', () => {

			it('after encryption is mnemonic and identityKeyPair are same', async () => {
				localStorage.setItem('payIDClaim', JSON.stringify({"virtualAddress":"yadunandan.cruxdev.crux","identitySecrets":"{\"iv\":\"XJmOCWeHzU4HfsYI\",\"encBuffer\":\"ss20WCh7PW64wWswkRUu/dxMkPro2KmD1rCGLKdtew82cPuJwZTqcdrfz9GBJOYqsHrzE4lOoUmODHeWor3ebC6vHCU8tQdg17Rlpdj3hx2FU0XTY1PsmJft4wZOvb9uThk6estvQgnj5/7quw9Be6oGt6gyCtOYsxtfSQysH0kfgRauCEOx4tTjSXO2GAufeEK4hubCC7bJ6iQCr9uAeMWRSxFknK8I+M62RnE8iINVp2yQ+5I3M7Z8oFRSzwi0nJAVps/rTMfZOw2mXYtgEgY59aSXItr+hHSGGF0pWHqlRNzcCbV11MdBCIrEHWhOnU/hK5PWSxJMRytIwEaYspXqWEu+KaftkKIxr/CU/rnCd8w/ML0lS7hMXljMG95BN66M8k5vXHkAmdmMRZdQN4Y4nD5vhxY0q69+37fH0LmsMG0tKdm3d4H8PVpu\"}"}))
				let cruxClient = new CruxClient(walletOptions);
				let oldEncryptionKey = "fookey"
				let newEncryptionKey = "fookey1"
				await cruxClient.init()
				await (cruxClient.getPayIDClaim()).decrypt(oldEncryptionKey)
				let decryptedBeforeValue: PayIDClaim = cruxClient.getPayIDClaim()
				await (cruxClient.getPayIDClaim()).encrypt(oldEncryptionKey)

				// function being tested
				let return_value = await cruxClient.updatePassword(oldEncryptionKey, newEncryptionKey)
				expect(return_value).is.true

				await (cruxClient.getPayIDClaim()).decrypt(newEncryptionKey)
				let decryptedAfterValue: PayIDClaim = cruxClient.getPayIDClaim()

				expect(decryptedBeforeValue.identitySecrets['mnemonic']).to.equal(decryptedAfterValue.identitySecrets['mnemonic'])
				expect(decryptedBeforeValue.identitySecrets['identityKeyPair']).to.equal(decryptedAfterValue.identitySecrets['identityKeyPair'])
				expect(decryptedBeforeValue.virtualAddress).to.equal(decryptedAfterValue.virtualAddress)
				localStorage.clear();
			})

		})

		describe("crux id tests", () => {
			describe("payIDClaim not available in localStorage", () => {

				it("getCruxIDState handling empty local storage",async () => {
					localStorage.clear();
					let cruxClient = new CruxClient(walletOptions);
					await cruxClient.init()
					let cruxIdState = await cruxClient.getCruxIDState()
					expect(cruxIdState.status.cruxID).to.equal(undefined)
				})
	
				it("getIDStatus handling empty local storage", async () => {
					localStorage.clear();
					let cruxClient = new CruxClient(walletOptions);
					await cruxClient.init()
					let cruxIDStatus = await cruxClient.getIDStatus()
					expect(cruxIDStatus.status).to.equal('NONE')
				})
			})

			it("invalid getEncryptionKey provided", async () => {
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient({
					getEncryptionKey: () => "fookey1",
					walletClientName: 'scatter_dev'
				});
				let raiseException = false
				try {
					await cruxClient.init()
				} catch(e) {
					console.log(e)
					raiseException = true
				}
				expect(raiseException).to.equal(true)
			})

			it("invalid payIDClaim in local storage", async () => {
				localStorage.setItem('payIDClaim', JSON.stringify({"virtualAddress":"yadunandan.devcoinswitch.id","identitySecrets":"{\"iv\":\"XJmOCWeHzU4HfsYI\",\"encBuffer\":\"ss20WCh7PW64wWswkRUu/dxMkPro2KmD1rCGLKdtew82cPuJwZTqcdrfz9GBJOYqsHrzE4lOoUmODHeWor3ebC6vHCU8tQdg17Rlpdj3hx2FU0XTY1PsmJft4wZOvb9uThk6estvQgnj5/7quw9Be6oGt6gyCtOYsxtfSQysH0kfgRauCEOx4tTjSXO2GAufeEK4hubCC7bJ6iQCr9uAeMWRSxFknK8I+M62RnE8iINVp2yQ+5I3M7Z8oFRSzwi0nJAVps/rTMfZOw2mXYtgEgY59aSXItr+hHSGGF0pWHqlRNzcCbV11MdBCIrEHWhOnU/hK5PWSxJMRytIwEaYspXqWEu+KaftkKIxr/CU/rnCd8w/ML0lS7hMXljMG95BN66M8k5vXHkAmdmMRZdQN4Y4nD5vhxY0q69+37fH0LmsMG0tKdm3d4H8PVpu\"}"}))
				let cruxClient = new CruxClient(walletOptions);
				let raiseException = false
				try{
					await cruxClient.init()
				} catch(e) {
					raiseException = true
					// complete error msg:- `Error: Only .crux namespace is supported in CruxID`
					expect(e.errorCode).to.equal(4005)
				}
				expect(raiseException).to.equal(true)
			})
		})

		describe("subdomain registration tests", () => {

			it("positive case, valid subdomain registration", async () => {
				localStorage.clear()
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()
				let registerNameStub = sinon.stub(cruxClient._nameService, 'registerName').resolves('hassan@cruxdev.crux')
				let raisedException = false
				try {
					await cruxClient.registerCruxID(sampleUser['cruxIDSubdomain'], sampleAddressMap)
				} catch(e) {
					raisedException = true
				}
				finally{
					// registering subdomain on blockchain and uploading profile information
					expect(raisedException).to.equal(false)
					registerNameStub.restore()

				}
			})

			it("valid subdomain registration, call to registrar failed", async () => {
				localStorage.clear()
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()

				let registerNameStub = sinon.stub(cruxClient._nameService, 'registerName').rejects(ErrorHelper.getPackageError(PackageErrorCode.GaiaProfileUploadFailed))
				let raisedException = false
				try {
					await cruxClient.registerCruxID(sampleUser['cruxIDSubdomain'])
				} catch(e) {
					expect(e.errorCode).to.equal(2005)
					raisedException = true
				} finally {
					expect(raisedException).to.equal(true)
					expect(registerNameStub.callCount).to.equal(1)
					registerNameStub.restore()
				}
			})
		})

		describe("subdomain currency address resolution", () => {
			it("positive case, exposed asset", async () => {
				localStorage.clear();
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()
				let mockedSampleAddress = sampleUser['addressMapping']

				let mockedClientMapping = { BTC: '1d6e1a99-1e77-41e1-9ebb-0e216faa166a' }

				let clientMappingStub = sinon.stub(cruxClient, '_clientMapping').value(mockedClientMapping)
				let addressMappingStub = sinon.stub(cruxClient._nameService, 'getAddressMapping').returns(mockedSampleAddress)

				let resolvedAddress = await cruxClient.resolveCurrencyAddressForCruxID(sampleUser['cruxID'], "BTC")
				expect(resolvedAddress.addressHash).to.equal('19m51F8YkjzK625csaNtKnM9pgByeMJRU3')
				clientMappingStub.restore()
				addressMappingStub.restore()
			})

			it("unexposed asset in client-mapping", async () => {
				localStorage.clear();
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()
				let mockedSampleAddress = sampleUser['addressMapping']

				let mockedClientMapping = { BTC: '1d6e1a99-1e77-41e1-9ebb-0e216faa166a' }

				let clientMappingStub = sinon.stub(cruxClient, '_clientMapping').value(mockedClientMapping)
				let addressMappingStub = sinon.stub(cruxClient._nameService, 'getAddressMapping').returns(mockedSampleAddress)
				let raisedException = false
				try {
					await cruxClient.resolveCurrencyAddressForCruxID(sampleUser['cruxID'], "ETH")
				} catch(e) {
					raisedException = true
					expect(e.errorCode).to.equal(1006)
				} finally {
					expect(raisedException).to.equal(true)
					clientMappingStub.restore()
					addressMappingStub.restore()
				}
			})

			it("unexposed asset by subdomain", async () => {
				localStorage.clear();
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()
				let mockedSampleAddress = {"1234567-1e77-41e1-9ebb-0e216faa166a": {addressHash: "19m51F8YkjzK625csaNtKnM9pgByeMJRU3"}}

				let mockedClientMapping = { BTC: '1d6e1a99-1e77-41e1-9ebb-0e216faa166a' }

				let clientMappingStub = sinon.stub(cruxClient, '_clientMapping').value(mockedClientMapping)
				let addressMappingStub = sinon.stub(cruxClient._nameService, 'getAddressMapping').returns(mockedSampleAddress)
				let raisedException = false
				try {
					await cruxClient.resolveCurrencyAddressForCruxID(sampleUser['cruxID'], "BTC")
				} catch(e) {
					raisedException = true
					expect(e.errorCode).to.equal(1005)
				} finally {
					expect(raisedException).to.equal(true)
					clientMappingStub.restore()
					addressMappingStub.restore()
				}
			})
		})

		describe("address mapping tests", () => {
			it("positive case, put address map", async () => {
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()
				let addressMappingStub = sinon.stub(cruxClient._nameService, 'putAddressMapping').resolves(true)
				expect(await cruxClient.putAddressMap(sampleAddressMap)).to.be.true
				addressMappingStub.restore()
			})

			it("positive case, get address map", async () => {
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']));
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()
				let mockedClientMapping = { BTC: '1d6e1a99-1e77-41e1-9ebb-0e216faa166a' }
				let clientMappingStub = sinon.stub(cruxClient, '_clientMapping').value(mockedClientMapping)
				let addressMappingStub = sinon.stub(cruxClient._nameService, 'getAddressMapping').returns(sampleUser['addressMapping'])
				let gotAddMap = await cruxClient.getAddressMap()
				expect(gotAddMap.BTC.addressHash).to.equal('19m51F8YkjzK625csaNtKnM9pgByeMJRU3')
				clientMappingStub.restore(gotAddMap.addressHash)
				addressMappingStub.restore()
			})

			it("put address map, gaia upload call failed", async () => {
				localStorage.setItem('payIDClaim', JSON.stringify(sampleUser['payIDClaim']))
				let cruxClient = new CruxClient(walletOptions);
				await cruxClient.init()
				let raisesException = false
				let updateProfileStub = sinon.stub(cruxClient._nameService, 'putAddressMapping').rejects(ErrorHelper.getPackageError(PackageErrorCode.GaiaProfileUploadFailed))
				try {
					await cruxClient.putAddressMap(sampleAddressMap)
				} catch(e) {
					raisesException = true
					expect(e.errorCode).to.equal(2005)
				} finally {
					expect(raisesException).to.be.true
					updateProfileStub.restore()
				}
			})
		})
	})

})
