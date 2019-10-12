import {Decoder, object, optional, string} from "@mojotech/json-type-validation";
import * as bip39 from "bip39";
import {bip32} from "bitcoinjs-lib";
import * as blockstack from "blockstack";
import { getLogger, IAddress, IAddressMapping } from "../..";
import config from "../../config";

import {ErrorHelper, PackageErrorCode} from "../error";
import { GaiaService } from "../gaia-service";
import { getContentFromGaiaHub } from "../gaia-service/utils";
import {BlockstackId, CruxId, IdTranslator} from "../identity-utils";
import * as utils from "../utils";
import * as nameService from "./index";
import { fetchNameDetails } from "./utils";

const log = getLogger(__filename);

// Blockstack Nameservice implementation
export interface IBitcoinKeyPair {
    privKey: string;
    pubKey: string;
    address: string;
}

export interface IBlockstackServiceOptions {
    domain: string;
    gaiaHub: string;
    subdomainRegistrar: string;
    bnsNodes: string[];
}

export enum SubdomainRegistrationStatus {
    NONE = "NONE",
    PENDING = "PENDING",
    DONE = "DONE",
    REJECT = "REJECT",
}

enum SubdomainRegistrationStatusDetail {
    NONE = "Subdomain not registered with this registrar.",
    PENDING_REGISTRAR = "Subdomain registration pending on registrar.",
    PENDING_BLOCKCHAIN = "Subdomain registration pending on blockchain.",
    DONE = "Subdomain propagated.",
}

interface IdentityCouple {
    cruxId: CruxId;
    bsId: BlockstackId;
}

const getIdentityCoupleFromCruxId = (cruxId: CruxId): IdentityCouple => {
    return {
        bsId: IdTranslator.cruxToBlockstack(cruxId),
        cruxId,
    };
};

const defaultBNSConfig: IBlockstackServiceOptions = {
    bnsNodes: config.BLOCKSTACK.BNS_NODES,
    domain: config.BLOCKSTACK.IDENTITY_DOMAIN,
    gaiaHub: config.BLOCKSTACK.GAIA_HUB,
    subdomainRegistrar: config.BLOCKSTACK.SUBDOMAIN_REGISTRAR,
};

export enum UPLOADABLE_JSON_FILES {
    CRUXPAY = "cruxpay.json",
    CLIENT_CONFIG = "client-config.json",
    CLIENT_MAPPING = "client-mapping.json",
    ASSET_LIST = "asset-list.json",
    PROFILE = "profile.json",
}

export class BlockstackService extends nameService.NameService {

    public static getUploadPackageErrorCodeForFilename = (filename: UPLOADABLE_JSON_FILES) => {
        let packageErrorCode;
        switch (filename) {
            case UPLOADABLE_JSON_FILES.CRUXPAY:
                packageErrorCode = PackageErrorCode.GaiaCruxPayUploadFailed;
                break;
            case UPLOADABLE_JSON_FILES.CLIENT_CONFIG:
                packageErrorCode = PackageErrorCode.GaiaClientConfigUploadFailed;
                break;
            case UPLOADABLE_JSON_FILES.ASSET_LIST:
                packageErrorCode = PackageErrorCode.GaiaAssetListUploadFailed;
                break;
            default:
                packageErrorCode = PackageErrorCode.GaiaUploadFailed;
        }
        return packageErrorCode;
    }

    public readonly type = "blockstack";

    private _domain: string;
    private _gaiaHub: string;
    private _subdomainRegistrar: string;
    private _bnsNodes: string[];
    private _identityCouple: IdentityCouple | undefined;
    private _gaiaService: GaiaService;

    constructor(options: any = {}) {
        super();
        // TODO: Verify Domain against Registrar
        const _options: IBlockstackServiceOptions = {...defaultBNSConfig, ...options};

        this._domain = _options.domain;
        this._gaiaHub = _options.gaiaHub;
        this._subdomainRegistrar = _options.subdomainRegistrar;
        // @ts-ignore
        this._bnsNodes = [...new Set([...config.BLOCKSTACK.BNS_NODES, ..._options.bnsNodes])];   // always append the extra configured BNS nodes (needs `downlevelIteration` flag enabled in tsconfig.json)
        this._gaiaService = new GaiaService(this._gaiaHub);

    }

    public restoreIdentity = async (fullCruxId: string, identityClaim: nameService.IIdentityClaim): Promise<nameService.IIdentityClaim> => {
        if (!identityClaim.secrets || !identityClaim.secrets.mnemonic) {
            throw ErrorHelper.getPackageError(PackageErrorCode.CouldNotFindMnemonicToRestoreIdentity);
        }

        const mnemonic = identityClaim.secrets.mnemonic;
        let identityKeyPair = identityClaim.secrets.identityKeyPair || undefined;

        // If identityKeypair is not stored locally, generate them using the mnemonic
        if (!identityKeyPair) {
            identityKeyPair = await this._generateIdentityKeyPair(mnemonic);
        }

        // TODO: validate the correspondance of cruxID with the identityClaim
        const cruxId = CruxId.fromString(fullCruxId);
        this._identityCouple = getIdentityCoupleFromCruxId(cruxId);
        const nameData: any = await fetchNameDetails(this._identityCouple.bsId.toString(), this._bnsNodes);
        if ( nameData.address && (nameData.address !== identityKeyPair.address)) {
            throw ErrorHelper.getPackageError(PackageErrorCode.IdentityMismatch);
        }

        return {
            secrets: {
                identityKeyPair,
                mnemonic,
            },
        };

    }

    public generateIdentity = async (): Promise<nameService.IIdentityClaim> => {
        const newMnemonic = this._generateMnemonic();
        log.warn(`Your new mnemonic backing your identity is: \n${newMnemonic}`);
        const identityKeyPair = await this._generateIdentityKeyPair(newMnemonic);
        return {
            secrets: {
                identityKeyPair,
                mnemonic: newMnemonic,
            },
        };
    }

    public registerName = async (identityClaim: nameService.IIdentityClaim, subdomain: string): Promise<string> => {
        const mnemonic = identityClaim.secrets.mnemonic;
        let identityKeyPair = identityClaim.secrets.identityKeyPair;
        // Check for existing mnemonic
        if (!mnemonic) {
            throw ErrorHelper.getPackageError(PackageErrorCode.CouldNotFindMnemonicToRegisterName);
        }
        // Generate the Identity key pair
        if (!identityKeyPair) {
            identityKeyPair = await this._generateIdentityKeyPair(mnemonic);
        }

        await this._gaiaService.uploadProfileInfo(identityKeyPair.privKey);

        const registeredSubdomain = await this._registerSubdomain(subdomain, identityKeyPair.address);
        this._identityCouple = getIdentityCoupleFromCruxId(new CruxId({
            domain: this._domain,
            subdomain,
        }));
        return this._identityCouple.cruxId.toString();
    }

    public getRegistrationStatus = async (identityClaim: nameService.IIdentityClaim): Promise<nameService.CruxIDRegistrationStatus> => {
        log.debug("====getRegistrationStatus====");
        if (!this._identityCouple) {
            return {
                status: SubdomainRegistrationStatus.NONE,
                status_detail: "",
            };
        }
        const nameData: any = await fetchNameDetails(this._identityCouple.bsId.toString(), this._bnsNodes);
        let status: SubdomainRegistrationStatus;
        let status_detail: string = "";
        if (nameData.status === "registered_subdomain") {
            if (nameData.address === identityClaim.secrets.identityKeyPair.address) {
                status = SubdomainRegistrationStatus.DONE;
                status_detail = SubdomainRegistrationStatusDetail.DONE;
            } else {
                status = SubdomainRegistrationStatus.REJECT;
            }
            return {
                status,
                status_detail,
            };
        }
        const options = {
            baseUrl: this._subdomainRegistrar,
            json: true,
            method: "GET",
            url: `/status/${this._identityCouple.bsId.components.subdomain}`,
        };
        log.debug("registration query params", options);
        const body = await utils.httpJSONRequest(options);
        const registrationStatus = this.getCruxIdRegistrationStatus(body);
        return registrationStatus;
    }

    public getNameAvailability = async (subdomain: string): Promise<boolean> => {
        const options = {
            baseUrl: this._subdomainRegistrar,
            json: true,
            method: "GET",
            url: `/status/${subdomain}`,
        };
        log.debug("registration query params", options);
        const body: any = await utils.httpJSONRequest(options);
        return body.status === "Subdomain not registered with this registrar";

    }

    public putAddressMapping = async (identityClaim: nameService.IIdentityClaim, addressMapping: IAddressMapping): Promise<boolean> => {
        if (!identityClaim.secrets.identityKeyPair) {
            throw ErrorHelper.getPackageError(PackageErrorCode.CouldNotFindIdentityKeyPairToPutAddressMapping);
        }
        const addressDecoder: Decoder<IAddress> = object({
            addressHash: string(),
            secIdentifier: optional(string()),
        });
        try {
            for ( const currency of Object.keys(addressMapping) ) {
                const addressObject: IAddress = addressDecoder.runWithException(addressMapping[currency]);
            }
        } catch (error) {
            throw ErrorHelper.getPackageError(PackageErrorCode.AddressMappingDecodingFailure);
        }
        await this._gaiaService.uploadContentToGaiaHub(UPLOADABLE_JSON_FILES.CRUXPAY, identityClaim.secrets.identityKeyPair.privKey, addressMapping);
        // TODO: need to validate the final uploaded URL is corresponding to the identityClaim provided
        return true;
    }

    public getAddressMapping = async (fullCruxId: string): Promise<IAddressMapping> => {
        const cruxId = CruxId.fromString(fullCruxId);
        const blockstackIdString = IdTranslator.cruxToBlockstack(cruxId).toString();
        return await getContentFromGaiaHub(blockstackIdString, UPLOADABLE_JSON_FILES.CRUXPAY);
    }

    private _generateMnemonic = (): string => {
        return blockstack.BlockstackWallet.generateMnemonic();
    }

    private _generateIdentityKeyPair = async (mnemonic: string): Promise<IBitcoinKeyPair> => {
        const wallet = new blockstack.BlockstackWallet(bip32.fromSeed(bip39.mnemonicToSeedSync(mnemonic)));
        // Using the first identity key pair for now
        // TODO: need to validate the name registration on the address if already available
        const { address, key, keyID} = wallet.getIdentityKeyPair(0);
        const identityKeyPair: IBitcoinKeyPair = {
            address,
            privKey: utils.sanitizePrivKey(key),
            pubKey: keyID,
        };
        return identityKeyPair;
    }

    private _registerSubdomain = async (name: string, bitcoinAddress: string): Promise<string> => {
        const options = {
            baseUrl: this._subdomainRegistrar,
            body: {
                name,
                owner_address: bitcoinAddress,
                zonefile: `$ORIGIN ${name}\n$TTL 3600\n_https._tcp URI 10 1 ${this._gaiaService.gaiaWriteUrl}`,
            },
            headers: {
                "Content-Type": "application/json",
            },
            json: true,
            method: "POST",
            strictSSL: false,
            url: "/register",
        };

        let registrationAcknowledgement: any;
        try {
            registrationAcknowledgement = await utils.httpJSONRequest(options);
        } catch (err) {
            throw ErrorHelper.getPackageError(PackageErrorCode.SubdomainRegistrationFailed, err);
        }

        log.debug(`Subdomain registration acknowledgement:`, registrationAcknowledgement);
        if (registrationAcknowledgement && registrationAcknowledgement.status === true) {
            return name;
        } else {
            throw ErrorHelper.getPackageError(PackageErrorCode.SubdomainRegistrationAcknowledgementFailed, JSON.stringify(registrationAcknowledgement));
        }
    }

    private getCruxIdRegistrationStatus = (body: any): nameService.CruxIDRegistrationStatus =>  {
        let status: nameService.CruxIDRegistrationStatus;
        const rawStatus = body.status;
        log.info(body);
        if (rawStatus && rawStatus.includes("Your subdomain was registered in transaction")) {
            status = {
            status: SubdomainRegistrationStatus.PENDING,
            status_detail: SubdomainRegistrationStatusDetail.PENDING_REGISTRAR,
            };
        } else {
            switch (rawStatus) {
                case "Subdomain not registered with this registrar":
                    status = {
                        status: SubdomainRegistrationStatus.NONE,
                        status_detail: SubdomainRegistrationStatusDetail.NONE,
                    };
                    break;
                case "Subdomain is queued for update and should be announced within the next few blocks.":
                    status = {
                        status: SubdomainRegistrationStatus.PENDING,
                        status_detail: SubdomainRegistrationStatusDetail.PENDING_BLOCKCHAIN,
                    };
                    break;
                case "Subdomain propagated":
                    log.debug("Skipping this because meant to be done by BNS node");
                default:
                    status = {
                        status: SubdomainRegistrationStatus.NONE,
                        status_detail: "",
                    };
                    break;
            }
        }
        return status;
    }
}
