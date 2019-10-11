import { GaiaService } from "../../../gaia-service";
import { getContentFromGaiaHub, getGaiaDataFromBlockstackID } from "../../../gaia-service/utils";
import { UPLOADABLE_JSON_FILES } from "../../../name-service/blockstack-service";
import { CruxUser } from "../../domain/cruxuser/aggregate";
import { CruxUserRepository } from "../../domain/cruxuser/repository";
import { IPublicKey, IUserID } from "../../shared-kernel/interfaces";
import { Address, KEY_ENCODING, KEY_TYPE, UserId } from "../../shared-kernel/models";

export class GaiaCruxUserRepository implements CruxUserRepository {

    private _gaiaService: GaiaService | undefined;

    constructor(gaiaWriterUrl: string) {
        this._gaiaService = new GaiaService(gaiaWriterUrl);
    }

    public getCruxUser = async (userId: IUserID): Promise<CruxUser> => {
        const userIdentifier = new UserId(userId);
        const bsIDString = userIdentifier.getBlockstackID().toString();
        const userProfile = await getContentFromGaiaHub(bsIDString, UPLOADABLE_JSON_FILES.PROFILE, true);
        const userContent = await getContentFromGaiaHub(bsIDString, UPLOADABLE_JSON_FILES.CRUXPAY);
        const publicKey: IPublicKey = {key: userProfile.issuer.publicKey, type: KEY_TYPE.PUBLIC_KEY, encoding: KEY_ENCODING.HEX};
        const addresses: [Address] = [];

        for (const assetId in userContent) {
            if (assetId) {
                const addressModel = new Address({assetId, address: userContent[assetId].addressHash, tag: userContent[assetId].secIdentifier, encoding: KEY_ENCODING.HEX});
                addresses.push(addressModel);
            }

        }

        return new CruxUser(userId, publicKey, addresses);
    }

    public updateCruxUser(userId: IUserID): Promise<CruxUser> {
        throw new Error("Method not implemented.");
    }
}
