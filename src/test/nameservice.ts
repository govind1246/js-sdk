import { expect } from 'chai';
import sinon from "sinon";
import 'mocha';

import { identityUtils, blockstackService, errors } from "../packages";
import * as utils from "../packages/utils";
import requestFixtures from "./requestMocks/nameservice-reqmocks";
import * as blockstack from 'blockstack';
import { IAddressMapping } from '../index';
import { sanitizePrivKey } from "../packages/utils";
import { UPLOADABLE_JSON_FILES } from '../packages/name-service/blockstack-service';
import { IdTranslator, BlockstackId } from '../packages/identity-utils';


// TODO: registration of already registered names and error handling
// TODO: resolving addresses with invalid name/id


describe('BlockstackService tests', () => {
  let blkstkService = new blockstackService.BlockstackService()
  let httpJSONRequestStub: sinon.SinonStub
  let connectToGaiaHubStub: sinon.SinonStub
  let uploadToGaiaHubStub: sinon.SinonStub

  // sample identity claim for 'cs1'
  let sampleSubdomain = 'cs1'
  let sampleCruxId = 'cs1@devcoinswitch.crux'
  let sampleIdentityClaim = {
    secrets: {
      mnemonic: "jelly level auction pluck system record unique huge text fold galaxy home",
      identityKeyPair: {
        privKey: "6bd397dc89272e71165a0e7d197b280c7a88ed5b1e44e1928c25455506f1968f",
        pubKey: "02bc9c3f8e924b7de9212cebd0129f1be2e6c3f2904e911b30698bde77be4878b8",
        address: "1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ"
      }
    }
  }
  let sampleIdentityClaimWithoutSecret = {
    secrets: undefined
  }
  let sampleIdentityClaimWithoutmnemonic = {
    secrets: {
      mnemonic: undefined,
      identityKeyPair: {
        privKey: "anyvalue",
        pubKey: "anyvalue",
        address: "anyvalue"
      }
    }
  }
  let sampleIdentityClaimWithoutIdentityKeyPair = {
    secrets: {
      mnemonic: "jelly level auction pluck system record unique huge text fold galaxy home",
      identityKeyPair: undefined
    }
  }
  let sampleAddressMap: IAddressMapping = {
    "BTC": {
      addressHash: "1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ"
    }
  }

  beforeEach(() => {
    // Handling mock stubs

    httpJSONRequestStub = sinon.stub(utils, 'httpJSONRequest').throws('unhandled in mocks')
    connectToGaiaHubStub = sinon.stub(blockstack, 'connectToGaiaHub').resolves({ address: "mock_address", url_prefix: "mock_url_prefix", token: "mock_token", server: "mock_server" })
    uploadToGaiaHubStub = sinon.stub(blockstack, 'uploadToGaiaHub').resolves("mocked zonefile URL")


    requestFixtures.forEach(requestObj => {
      httpJSONRequestStub.withArgs(requestObj.request).returns(requestObj.response)
    })

  })

  afterEach(() => {
    httpJSONRequestStub.restore()
    connectToGaiaHubStub.restore()
    uploadToGaiaHubStub.restore()
  })

  // Test cases

  describe('generateIdentity tests', () => {
    it('always generates a proper identity claim (mnemonic and a keypair)', async () => {
      let generatedIdentityClaim = await blkstkService.generateIdentity()
      expect(generatedIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('mnemonic').to.be.a('string')
      expect(generatedIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('pubKey').to.be.a('string')
      expect(generatedIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('privKey').to.be.a('string')
      expect(generatedIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('address').to.be.a('string')
    })
  })

  describe('restoreIdentity tests', () => {
    it('given cruxID and identityClaim with mnemonic, should return the corresponding full identityClaim', async () => {
      let restoredIdentityClaim = await blkstkService.restoreIdentity(sampleCruxId, sampleIdentityClaim)
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('mnemonic').to.be.a('string')
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('pubKey').to.be.a('string')
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('privKey').to.be.a('string')
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('address').to.be.a('string')
    })
    it('given cruxID without identityClaim, should throw "CouldNotFindMnemonicToRestoreIdentity"', async () => {
      let raisedError;
      try {
        let restoredIdentityClaim = await blkstkService.restoreIdentity(sampleCruxId, {secrets: {}})
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.CouldNotFindMnemonicToRestoreIdentity)
    })
    it('given cruxID with identityClaim (only mnemonic), should return the corresponding full identityClaim', async () => {
      let restoredIdentityClaim = await blkstkService.restoreIdentity(sampleCruxId, {secrets: {mnemonic: sampleIdentityClaim.secrets.mnemonic}})
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('mnemonic').to.be.a('string')
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('pubKey').to.be.a('string')
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('privKey').to.be.a('string')
      expect(restoredIdentityClaim).haveOwnProperty('secrets').haveOwnProperty('identityKeyPair').haveOwnProperty('address').to.be.a('string')
    })
    it('given identityClaim with mnemonic with invalid cruxID, should throw "CruxIdLengthValidation" | "CruxIdNamespaceValidation"')
    it('given identityClaim with mnemonic and non-corresponding cruxID, should throw error')
    it('given identityClaim without mnemonic, should throw "CouldNotFindMnemonicToRestoreIdentity"', async() => {
      let raisedError
        try {
          let restoredIdentityClaimWithoutMnemonic = await blkstkService.restoreIdentity(sampleCruxId, sampleIdentityClaimWithoutmnemonic)
        }
        catch (error) {
          raisedError = error
        }
        expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.CouldNotFindMnemonicToRestoreIdentity)
    })
  })

  describe('PrivateKey sanitization tests', () => {
    let uncompressedKey = "6bd397dc89272e71165a0e7d197b280c7a88ed5b1e44e1928c25455506f1968f01"
    let compressedKey = "6bd397dc89272e71165a0e7d197b280c7a88ed5b1e44e1928c25455506f1968f"

    it('given an uncompressed key returns compressed key', () => {
      // @ts-ignore
      expect(sanitizePrivKey(uncompressedKey)).to.equal(compressedKey)
    })

    it('given an compressed key returns compressed key', () => {
      // @ts-ignore
      expect(sanitizePrivKey(compressedKey)).to.equal(compressedKey)
    })
  })

  describe('getNameAvailability tests', () => {
    let registeredSubdomain = 'cs1'
    let unregisteredSubdomain = 'example'

    it(`${registeredSubdomain}@devcoinswitch.crux should be unavailable`, async () => {
      let resolvedPublicKey = await blkstkService.getNameAvailability(registeredSubdomain)
      let options = {
        baseUrl: "https://registrar.coinswitch.co:3000",
        json: true,
        method: "GET",
        url: `/status/${registeredSubdomain}`,
      }
      expect(httpJSONRequestStub.calledOnce).is.true
      expect(httpJSONRequestStub.calledWith(options)).is.true
      expect(resolvedPublicKey).is.false
    })
    it(`${unregisteredSubdomain}@devcoinswitch.crux should be available`, async () => {
      let resolvedPublicKey = await blkstkService.getNameAvailability(unregisteredSubdomain)
      let options = {
        baseUrl: "https://registrar.coinswitch.co:3000",
        json: true,
        method: "GET",
        url: `/status/${unregisteredSubdomain}`,
      }
      expect(httpJSONRequestStub.calledOnce).is.true
      expect(httpJSONRequestStub.calledWith(options)).is.true
      expect(resolvedPublicKey).is.true
    })

  })

  describe('getRegistrationStatus tests', () => {
    let unavailableStatus = { 
      'status': 'NONE',
      'status_detail': ''
    }
    let pendingStatus = {
      'status': 'PENDING',
      'status_detail': 'Subdomain registration pending on blockchain.'
    };
    let registeredStatus = {
      'status': 'DONE',
      'status_detail': 'Subdomain propagated.'
    };
    let noneStatus = {
      'status': 'NONE',
      'status_detail': 'Subdomain not registered with this registrar.'
    }
    let registrarPendingStatus = {
      'status': 'PENDING',
      'status_detail': 'Subdomain registration pending on registrar.'
    };
    let rejectStatus = {
      'status': 'REJECT',
      'status_detail': ''
    }

    it('given identityClaim, without restoring identity, should return NONE', async () => {
      // initialise the nameservice
      let bs = new blockstackService.BlockstackService()
      // fetch registrationStatus
      let resolvedStatus = await bs.getRegistrationStatus(sampleIdentityClaim);
      expect(httpJSONRequestStub.notCalled).is.true
      expect(resolvedStatus).to.eql(unavailableStatus)
    })
    it('given pending identityClaim (carol@devcoinswitch.crux), after restoring the identity, should return PENDING', async () => {
      let pendingCruxId = "carol@devcoinswitch.crux";
      let pendingIdentityClaim = { "secrets": { "identityKeyPair": { "address": "1FnntbZKRLB7rZFvng9PDgvMMEXMek1jrv", "privKey": "d4f1d65bbe0a89a91506828f4e62639b99558aeffda06b6f66961dccec5e301b01", "pubKey": "03d2b5b73bd06b624ccd24d05d0ffc259e7b9180d85b29f61e16404866fe344e60" }, "mnemonic": "minute furnace room favorite hunt auto scrap angry tribe wait foam drive" } }
      let bnsRequestOptions1 = {
        baseUrl: 'https://core.blockstack.org',
        json: true,
        method: "GET",
        url: `/v1/names/carol.devcoinswitch.id`,
      }
      let bnsRequestOptions2 = {
        baseUrl: 'https://bns.cruxpay.com',
        json: true,
        method: "GET",
        url: `/v1/names/carol.devcoinswitch.id`,
      }
      let registrarRequestOptions = {
        baseUrl: "https://registrar.coinswitch.co:3000",
        json: true,
        method: "GET",
        url: `/status/carol`,
      }
      // initialise the nameservice
      let bs = new blockstackService.BlockstackService()
      // restore identity
      await bs.restoreIdentity(pendingCruxId, pendingIdentityClaim)
      // fetch registrationStatus
      let resolvedStatus = await bs.getRegistrationStatus(pendingIdentityClaim)
      expect(httpJSONRequestStub.callCount).to.equal(5)
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions1)).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions2)).is.true
      expect(httpJSONRequestStub.calledWith(registrarRequestOptions)).is.true
      expect(resolvedStatus).to.eql(pendingStatus)
    })

    it('given any identityClaim (carol1@devcoinswitch.crux), if registration status does not match, return NONE', async () => {
      let pendingCruxId = "carol1@devcoinswitch.crux";
      let pendingIdentityClaim = { "secrets": { "identityKeyPair": { "address": "1FnntbZKRLB7rZFvng9PDgvMMEXMek1jrv", "privKey": "d4f1d65bbe0a89a91506828f4e62639b99558aeffda06b6f66961dccec5e301b01", "pubKey": "03d2b5b73bd06b624ccd24d05d0ffc259e7b9180d85b29f61e16404866fe344e60" }, "mnemonic": "minute furnace room favorite hunt auto scrap angry tribe wait foam drive" } }
      let bnsRequestOptions1 = {
        baseUrl: 'https://core.blockstack.org',
        json: true,
        method: "GET",
        url: `/v1/names/carol1.devcoinswitch.id`,
      }
      let bnsRequestOptions2 = {
        baseUrl: 'https://bns.cruxpay.com',
        json: true,
        method: "GET",
        url: `/v1/names/carol1.devcoinswitch.id`,
      }
      let registrarRequestOptions = {
        baseUrl: "https://registrar.coinswitch.co:3000",
        json: true,
        method: "GET",
        url: `/status/carol1`,
      }
      // initialise the nameservice
      let bs = new blockstackService.BlockstackService()
      // restore identity
      await bs.restoreIdentity(pendingCruxId, pendingIdentityClaim)
      // fetch registrationStatus
      let resolvedStatus = await bs.getRegistrationStatus(pendingIdentityClaim)
      expect(httpJSONRequestStub.callCount).to.equal(5)
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions1)).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions2)).is.true
      expect(httpJSONRequestStub.calledWith(registrarRequestOptions)).is.true
      expect(resolvedStatus).to.eql(unavailableStatus)
    })

    it('given not registered identityClaim (carol2@devcoinswitch.crux), should return NONE', async () => {
      let pendingCruxId = "carol2@devcoinswitch.crux";
      let pendingIdentityClaim = { "secrets": { "identityKeyPair": { "address": "1FnntbZKRLB7rZFvng9PDgvMMEXMek1jrv", "privKey": "d4f1d65bbe0a89a91506828f4e62639b99558aeffda06b6f66961dccec5e301b01", "pubKey": "03d2b5b73bd06b624ccd24d05d0ffc259e7b9180d85b29f61e16404866fe344e60" }, "mnemonic": "minute furnace room favorite hunt auto scrap angry tribe wait foam drive" } }
      let bnsRequestOptions1 = {
        baseUrl: 'https://core.blockstack.org',
        json: true,
        method: "GET",
        url: `/v1/names/carol2.devcoinswitch.id`,
      }
      let bnsRequestOptions2 = {
        baseUrl: 'https://bns.cruxpay.com',
        json: true,
        method: "GET",
        url: `/v1/names/carol2.devcoinswitch.id`,
      }
      let registrarRequestOptions = {
        baseUrl: "https://registrar.coinswitch.co:3000",
        json: true,
        method: "GET",
        url: `/status/carol2`,
      }
      // initialise the nameservice
      let bs = new blockstackService.BlockstackService()
      // restore identity
      await bs.restoreIdentity(pendingCruxId, pendingIdentityClaim)
      // fetch registrationStatus
      let resolvedStatus = await bs.getRegistrationStatus(pendingIdentityClaim)
      expect(httpJSONRequestStub.callCount).to.equal(5)
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions1)).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions2)).is.true
      expect(httpJSONRequestStub.calledWith(registrarRequestOptions)).is.true
      expect(resolvedStatus).to.eql(noneStatus)
    })
    it(`given registered identityClaim (cs1@devcoinswitch.crux), after restoring the identity, should return DONE`, async () => {
      let bnsRequestOptions1 = {
        baseUrl: 'https://core.blockstack.org',
        json: true,
        method: "GET",
        url: `/v1/names/cs1.devcoinswitch.id`,
      }
      let bnsRequestOptions2 = {
        baseUrl: 'https://bns.cruxpay.com',
        json: true,
        method: "GET",
        url: `/v1/names/cs1.devcoinswitch.id`,
      }

      // initialise the nameservice
      let bs = new blockstackService.BlockstackService();
      // restore the identity using identityClaim
      await bs.restoreIdentity(sampleCruxId, sampleIdentityClaim)
      // fetch registrationStatus
      let resolvedStatus = await bs.getRegistrationStatus(sampleIdentityClaim);
      expect(httpJSONRequestStub.callCount).to.equal(4)
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions1)).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions2)).is.true
      expect(resolvedStatus).to.eql(registeredStatus);
    })
    it(`given registrat pending identityClaim (carol3@devcoinswitch.crux), should return PENDING`, async () => {
      let pendingCruxId = "carol3@devcoinswitch.crux";
      let pendingIdentityClaim = { "secrets": { "identityKeyPair": { "address": "1FnntbZKRLB7rZFvng9PDgvMMEXMek1jrv", "privKey": "d4f1d65bbe0a89a91506828f4e62639b99558aeffda06b6f66961dccec5e301b01", "pubKey": "03d2b5b73bd06b624ccd24d05d0ffc259e7b9180d85b29f61e16404866fe344e60" }, "mnemonic": "minute furnace room favorite hunt auto scrap angry tribe wait foam drive" } }
      let bnsRequestOptions1 = {
        baseUrl: 'https://core.blockstack.org',
        json: true,
        method: "GET",
        url: `/v1/names/carol3.devcoinswitch.id`,
      }
      let bnsRequestOptions2 = {
        baseUrl: 'https://bns.cruxpay.com',
        json: true,
        method: "GET",
        url: `/v1/names/carol3.devcoinswitch.id`,
      }
      let registrarRequestOptions = {
        baseUrl: "https://registrar.coinswitch.co:3000",
        json: true,
        method: "GET",
        url: `/status/carol3`,
      }

      let bs = new blockstackService.BlockstackService();
      await bs.restoreIdentity(pendingCruxId, pendingIdentityClaim)
      let resolvedStatus = await bs.getRegistrationStatus(sampleIdentityClaim);
      expect(httpJSONRequestStub.callCount).to.equal(5)
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions1)).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions2)).is.true
      expect(httpJSONRequestStub.calledWith(registrarRequestOptions)).is.true
      expect(resolvedStatus).to.eql(registrarPendingStatus);
    })
    it(`address for bns node and identityclaim mismatch(carol4@devcoinswitch.crux), should return PENDING`, async () => {
      let CruxId = "carol4@devcoinswitch.crux";
      let IdentityClaim1 = { "secrets": { "identityKeyPair": { "address": "1FnntbZKRLB7rZFvng9PDgvMMEXMek1jrv", "privKey": "d4f1d65bbe0a89a91506828f4e62639b99558aeffda06b6f66961dccec5e301b01", "pubKey": "03d2b5b73bd06b624ccd24d05d0ffc259e7b9180d85b29f61e16404866fe344e60" }, "mnemonic": "minute furnace room favorite hunt auto scrap angry tribe wait foam drive" } }
      let IdentityClaim2 = { "secrets": { "identityKeyPair": { "address": "1FnntbZKRLB7rZFvng9PDgvMMEXMek1jrv_something", "privKey": "d4f1d65bbe0a89a91506828f4e62639b99558aeffda06b6f66961dccec5e301b01", "pubKey": "03d2b5b73bd06b624ccd24d05d0ffc259e7b9180d85b29f61e16404866fe344e60" }, "mnemonic": "minute furnace room favorite hunt auto scrap angry tribe wait foam drive" } }
      let bnsRequestOptions1 = {
        baseUrl: 'https://core.blockstack.org',
        json: true,
        method: "GET",
        url: `/v1/names/carol4.devcoinswitch.id`,
      }
      let bnsRequestOptions2 = {
        baseUrl: 'https://bns.cruxpay.com',
        json: true,
        method: "GET",
        url: `/v1/names/carol4.devcoinswitch.id`,
      }
      let bs = new blockstackService.BlockstackService();
      await bs.restoreIdentity(CruxId, IdentityClaim1)
      let resolvedStatus = await bs.getRegistrationStatus(IdentityClaim2);
      expect(httpJSONRequestStub.callCount).to.equal(4)
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions1)).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions2)).is.true
      expect(resolvedStatus).to.eql(rejectStatus);
    })
  })

  describe('registerName tests', () => {
    let desiredName = 'bob'
    let expectedRegisteredName = 'bob@devcoinswitch.crux'
    let hubInfoRequestOptions = {
      method: 'GET',
      url: "https://hub.cruxpay.com/hub_info",
      json: true
    }
    let registrarRequestOptions = {
      method: 'POST',
      baseUrl: 'https://registrar.coinswitch.co:3000',
      url: '/register',
      headers: { 'Content-Type': 'application/json' },
      body: {
        zonefile:
          '$ORIGIN bob\n$TTL 3600\n_https._tcp URI 10 1 https://hub.cruxpay.com',
        name: 'bob',
        owner_address: '1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ'
      },
      json: true,
      strictSSL: false
    }
    let redundantRegistrarRequestOptions = {
      method: 'POST',
      baseUrl: 'https://registrar.coinswitch.co:3000',
      url: '/register',
      headers: { 'Content-Type': 'application/json' },
      body:
      {
        zonefile:
          '$ORIGIN cs1\n$TTL 3600\n_https._tcp URI 10 1 https://hub.cruxpay.com',
        name: 'cs1',
        owner_address: '1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ'
      },
      json: true,
      strictSSL: false
    }
    let registrarRequestOptions2 = {
      method: 'POST',
      baseUrl: 'https://registrar.coinswitch.co:3000',
      url: '/register',
      headers: { 'Content-Type': 'application/json' },
      body: {
        zonefile:
          '$ORIGIN mark\n$TTL 3600\n_https._tcp URI 10 1 https://hub.cruxpay.com',
        name: 'mark',
        owner_address: '1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ'
      },
      json: true,
      strictSSL: false
    }
    it('if uploadToGaiaHub breaks, should raise "GaiaProfileUploadFailed"', async () => {
      uploadToGaiaHubStub.onCall(0).throws('unhandled in mocks')
      let raisedError
      try {
        await blkstkService.registerName(sampleIdentityClaim, sampleSubdomain)
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.GaiaProfileUploadFailed)
      expect(uploadToGaiaHubStub.calledOnce).is.true
    })

    it('given valid identityClaim (only mnemonic) and a non-registered cruxId, should successfully register and return the fullCruxId', async () => {
      let registeredName = await blkstkService.registerName({ secrets: { mnemonic: sampleIdentityClaim.secrets.mnemonic } }, desiredName)
      expect(httpJSONRequestStub.calledOnce).is.true
      // expect(httpJSONRequestStub.calledWith(hubInfoRequestOptions)).is.true
      expect(httpJSONRequestStub.calledWith(registrarRequestOptions)).is.true
      expect(registeredName).is.equal(expectedRegisteredName)
    })

    it('given valid identityClaim and a non-registered cruxId (bob@devcoinswitch.crux), should successfully register and return the fullCruxId', async () => {
      let registeredName = await blkstkService.registerName(sampleIdentityClaim, desiredName)
      expect(httpJSONRequestStub.calledOnce).is.true
      // expect(httpJSONRequestStub.calledWith(hubInfoRequestOptions)).is.true
      expect(httpJSONRequestStub.calledWith(registrarRequestOptions)).is.true
      expect(registeredName).is.equal(expectedRegisteredName)
    })
    it('given valid identityClaim and a registered cruxId, should throw "SubdomainRegistrationFailed"', async () => {
      uploadToGaiaHubStub.resolves("https://gaia.cruxpay.com/1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ/cruxpay.json")
      let raisedError
      try {
        await blkstkService.registerName(sampleIdentityClaim, sampleSubdomain)
      } catch (error) {
        raisedError = error
      }
      expect(uploadToGaiaHubStub.calledOnce).is.true
      // expect(httpJSONRequestStub.calledOnce).is.true
      expect(uploadToGaiaHubStub.calledWith('profile.json')).is.true
      expect(httpJSONRequestStub.calledWith(redundantRegistrarRequestOptions)).is.true
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.SubdomainRegistrationFailed)
    })

    it('given identityClaim without mnemonic should throw "CouldNotFindMnemonicToRegisterName"', async() => {
      let raisedError
      try {
        await blkstkService.registerName(sampleIdentityClaimWithoutmnemonic, sampleSubdomain)
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.CouldNotFindMnemonicToRegisterName)
    })
    it('given valid identityClaim and a cruxId, if registration status is false then sould SubdomainRegistrationAcknowledgementFailed', async () => {
      let desiredName = 'mark'
      let raisedError
      try {
        await blkstkService.registerName({ secrets: { mnemonic: sampleIdentityClaim.secrets.mnemonic } }, desiredName) 
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.SubdomainRegistrationAcknowledgementFailed)
    })
  })

  describe('putAddressMapping tests', () => {
    it('given valid identityClaim and valid addressMap, should resolve the promise without errors', async () => {
      // mocked values
      connectToGaiaHubStub.resolves({ "url_prefix": "https://gaia.cruxpay.com/", "address": "1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ", "token": "v1:eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJnYWlhQ2hhbGxlbmdlIjoiW1wiZ2FpYWh1YlwiLFwiMFwiLFwic3RvcmFnZTIuYmxvY2tzdGFjay5vcmdcIixcImJsb2Nrc3RhY2tfc3RvcmFnZV9wbGVhc2Vfc2lnblwiXSIsImh1YlVybCI6Imh0dHBzOi8vaHViLmJsb2Nrc3RhY2sub3JnIiwiaXNzIjoiMDJiYzljM2Y4ZTkyNGI3ZGU5MjEyY2ViZDAxMjlmMWJlMmU2YzNmMjkwNGU5MTFiMzA2OThiZGU3N2JlNDg3OGI4Iiwic2FsdCI6ImE0ODk1ZWE1ZjdjZjI2N2VhNDEwMjg2ZjRjNzk4MTY3In0.QFuEEVijDYMKHjERaPA_YXwnwWoBq8iVg4pzEusP0S_u5jSmmxqeJcumyMK8cqT4NTmOYgnMUC4u4-9OAUWOIQ", "server": "https://hub.cruxpay.com" })
      uploadToGaiaHubStub.resolves("https://gaia.cruxpay.com/1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ/cruxpay.json")

      // initialising the nameservice
      let bs = new blockstackService.BlockstackService()
      // restoring identity
      await bs.restoreIdentity(sampleCruxId, sampleIdentityClaim)
      let acknowledgement = await bs.putAddressMapping(sampleIdentityClaim, sampleAddressMap)

      expect(connectToGaiaHubStub.calledOnce).is.true
      expect(uploadToGaiaHubStub.calledOnce).is.true
      expect(acknowledgement).is.true
    })
    it('given valid identityClaim and invalid addressMap, should throw "AddressMappingDecodingFailure"', async () => {
      // initialising the nameservice
      let bs = new blockstackService.BlockstackService()
      // restoring identity
      await bs.restoreIdentity(sampleCruxId, sampleIdentityClaim)

      let raisedError
      try {
        let acknowledgement = await bs.putAddressMapping(sampleIdentityClaim, { invalidKey: "invalidAddress" })
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.AddressMappingDecodingFailure)
    })
    it('given invalid identityClaim (only mnemonic) and valid addressMap, should throw "CouldNotFindIdentityKeyPairToPutAddressMapping"', async () => {
      // initialising the nameservice
      let bs = new blockstackService.BlockstackService()
      // restoring identity
      await bs.restoreIdentity(sampleCruxId, sampleIdentityClaim)

      let raisedError
      try {
        let acknowledgement = await bs.putAddressMapping({secrets: {mnemonic: sampleIdentityClaim.secrets.mnemonic}}, sampleAddressMap)
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.CouldNotFindIdentityKeyPairToPutAddressMapping)
    })
    it('if uploadContentToGaiaHub breaks, should raise "GaiaCruxPayUploadFailed"', async () => {
      uploadToGaiaHubStub.onCall(0).throws('unhandled in mocks')
      let bs = new blockstackService.BlockstackService()
      await bs.restoreIdentity(sampleCruxId, sampleIdentityClaim)
      let raisedError
      try {
        await bs.putAddressMapping(sampleIdentityClaim, sampleAddressMap)
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.GaiaCruxPayUploadFailed)
      expect(connectToGaiaHubStub.calledOnce).is.true
      expect(uploadToGaiaHubStub.calledOnce).is.true
    })
  })

  describe('getAddressMapping tests', () => {
    let bnsRequestOptions1 = {
      method: 'GET',
      baseUrl: 'https://core.blockstack.org',
      url: '/v1/names/cs1.devcoinswitch.id',
      json: true
    }
    let bnsRequestOptions2 = {
      method: 'GET',
      baseUrl: 'https://bns.cruxpay.com',
      url: '/v1/names/cs1.devcoinswitch.id',
      json: true
    }
    let gaiaRequestOptions = { method: "GET", url: "https://gaia.cruxpay.com/1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ/cruxpay.json", json: true }

    it('given registered cruxId (sanchay@devcoinswitch.crux), which does not have pulic addressMap should throw "GaiaEmptyResponse"')
    it('given registered cruxId (cs1@devcoinswitch.crux), which have public addressMap should resolve the addressMap', async () => {
      let resolvedAddressMap: IAddressMapping = await blkstkService.getAddressMapping(sampleCruxId)
      expect(httpJSONRequestStub.calledThrice).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions1)).is.true
      expect(httpJSONRequestStub.calledWith(bnsRequestOptions2)).is.true
      expect(httpJSONRequestStub.calledWith(gaiaRequestOptions)).is.true
      expect(resolvedAddressMap).is.eql(sampleAddressMap)
    })
    it('given unregistered cruxId, should throw "UserDoesNotExist"', async () => {
      let raisedError
      try {
        let resolvedAddressMap: IAddressMapping = await blkstkService.getAddressMapping("example@devcoinswitch.crux")
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.UserDoesNotExist)
    })
    it('given registered cruxId, which has not made addresses public, should throw "GaiaEmptyResponse"', async() => {
      let gaiaRequestOptions = { method: "GET", url: "https://gaia.cruxpay.com/1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ/cruxpay.json", json: true }
      let response = "<Error><Code>BlobNotFound</Code><Message>The specified blob does not exist.RequestId:299c4c0b-701e-0066-67df-7d085b000000Time:2019-10-08T13:54:51.8653868Z</Message></Error>"
      httpJSONRequestStub.withArgs(gaiaRequestOptions).returns(response)
      let raisedError
      try {
        await blkstkService.getAddressMapping("cs1@devcoinswitch.crux")
      } catch (error) {
        raisedError = error
      }
      expect(raisedError.errorCode).to.be.equal(errors.PackageErrorCode.GaiaEmptyResponse)
    })
  })
  describe("getUploadPackageErrorCodeForFilename tests", () => {
    it("given filename, returns upload package error code", async() => {
      let fileNameCruxPay = UPLOADABLE_JSON_FILES.CRUXPAY
      let fileNameClientConfig = UPLOADABLE_JSON_FILES.CLIENT_CONFIG
      let fileNameAssetList = UPLOADABLE_JSON_FILES.ASSET_LIST
      let fileNameProfile = UPLOADABLE_JSON_FILES.PROFILE
      
      let cruxPayStatus = blockstackService.BlockstackService.getUploadPackageErrorCodeForFilename(fileNameCruxPay)
      expect(cruxPayStatus).to.be.equal(errors.PackageErrorCode.GaiaCruxPayUploadFailed)

      let clientConfigPayStatus = blockstackService.BlockstackService.getUploadPackageErrorCodeForFilename(fileNameClientConfig)
      expect(clientConfigPayStatus).to.be.equal(errors.PackageErrorCode.GaiaClientConfigUploadFailed)
      
      let assetListPayStatus = blockstackService.BlockstackService.getUploadPackageErrorCodeForFilename(fileNameAssetList)
      expect(assetListPayStatus).to.be.equal(errors.PackageErrorCode.GaiaAssetListUploadFailed)
      
      let profileStatus = blockstackService.BlockstackService.getUploadPackageErrorCodeForFilename(fileNameProfile)
      expect(profileStatus).to.be.equal(errors.PackageErrorCode.GaiaUploadFailed)
    })
  })

})
