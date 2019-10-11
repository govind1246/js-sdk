import { CruxUser } from "../../packages/payment/domain/cruxuser/aggregate";
import { CruxClient } from "../..";
var assert = require('chai').assert;

describe("Send Payment Request tests", () => {

    let senderCruxWallet: CruxClient
    let recieverCruxWallet: CruxClient;
    let walletOptions: any;

    beforeEach(async () => {
        walletOptions = {
            getEncryptionKey: () => "fookey",
            walletClientName: 'cruxdev'
        }
    });

    it("check CruxUser validation encapsulated by CruxClient", async () => {

        console.log("initialising sender crux wallet");
        localStorage.setItem('payIDClaim', JSON.stringify({"virtualAddress":"sanchay@cruxdev.crux","identitySecrets":"{\"iv\":\"AVi439D6t5jjJsep\",\"encBuffer\":\"CSaKusFVxTFpAVJeXDb4UPDnZHYrdjjvaxp/qV8ONcYeuKrsk3gOTbC2mP30fEd7nNn3f7rpYEs9iJZ+kTBsNLMpflTST1mhXswiL2aSGGYqH3POU/HCssu+Dbmi1HP9lSRlXa/jyRfKtyh/JZPRdyo6eXkIpn3bJ7eeVkoHgbScPRDiWH+AfBRHMzwexVzjt8+WUK/ZrnCd0apLgbFxi6xdVM8z6uIAjf/e8+Gcde2jGeW5LI5TSj+ji/0uNyoF6viYfljYtlxHqnFOiHazKmURpAWEQVTOKYQ3zi9gIb81crtFJB6/oNc3MyOBhYNJ32ThruziQAFsrPTixhVs4znNkmXUax+3Vnqj0XSJYVzwyizYC/F1F0/rkbcaTvEgeJ61CLKYtIJZPEnvsWsFB9NepcCJZnv7SqC+E6OMZTUCydFns+Az7l8u5h+tzAeUSeE=\"}"}))
        senderCruxWallet = new CruxClient(walletOptions);
        await senderCruxWallet.init();
        console.log("initialised sender crux wallet");

        console.log("initialising reciever crux wallet");
        localStorage.setItem('payIDClaim', JSON.stringify({"identitySecrets":"{\"iv\":\"Zeww9POcmRieL9ik\",\"encBuffer\":\"a7wuD79VAQ7nugbow2+m5O7UosexhLx9lS6993Ov4/CmrpnSVaWXPPAOOOA7pHE73Iz53bAs7rn3iFf4BOSf5GnvZZ7QR/5nyA1Xy3hNWSfxzwPfJQUcQpHrAuAxMOFe8a1vbNMATzPpU4YRTETjSOG2peGVM35dFYNNkO96/FRfOgAQ4tlFLPwgxwuiR7mZMgOGUN+lMWBynSn/moxnqE81osm2Ezv5ROEhENyHS8UnTF9TC5qtPHkkDg2y2Nuu4zsVr8szItaMvw7VueFxR2g8hTUTFNrWYxe/hBmb6nLW2I6TBBVId9fjQhcQK0PMshMpoDxJZamn321XxnRhR55HllTQQWQsejyhHMlfrF2ueypyQsp+o7ATBpHJxwVXx8WmW0TSvhB9MGg+PfROP1pPMM5GDEjJRPNF4g689DoA/PDZwrLtAz6ojg==\"}","virtualAddress":"amit@cruxdev.crux"}))
        recieverCruxWallet = new CruxClient(walletOptions);
        await recieverCruxWallet.init();
        console.log("initialised reciever crux wallet");

        console.log("checking if the sender and the reciever wallet are initiailised properly")
        assert.instanceOf(senderCruxWallet._cruxUser, CruxUser);
        assert.instanceOf(recieverCruxWallet._cruxUser, CruxUser)
    });

    it("check CruxUser validation encapsulated by CruxClient", async () => {

        console.log("initialising sender crux wallet");
        localStorage.setItem('payIDClaim', JSON.stringify({"virtualAddress":"sanchay@cruxdev.crux","identitySecrets":"{\"iv\":\"AVi439D6t5jjJsep\",\"encBuffer\":\"CSaKusFVxTFpAVJeXDb4UPDnZHYrdjjvaxp/qV8ONcYeuKrsk3gOTbC2mP30fEd7nNn3f7rpYEs9iJZ+kTBsNLMpflTST1mhXswiL2aSGGYqH3POU/HCssu+Dbmi1HP9lSRlXa/jyRfKtyh/JZPRdyo6eXkIpn3bJ7eeVkoHgbScPRDiWH+AfBRHMzwexVzjt8+WUK/ZrnCd0apLgbFxi6xdVM8z6uIAjf/e8+Gcde2jGeW5LI5TSj+ji/0uNyoF6viYfljYtlxHqnFOiHazKmURpAWEQVTOKYQ3zi9gIb81crtFJB6/oNc3MyOBhYNJ32ThruziQAFsrPTixhVs4znNkmXUax+3Vnqj0XSJYVzwyizYC/F1F0/rkbcaTvEgeJ61CLKYtIJZPEnvsWsFB9NepcCJZnv7SqC+E6OMZTUCydFns+Az7l8u5h+tzAeUSeE=\"}"}))
        senderCruxWallet = new CruxClient(walletOptions);
        await senderCruxWallet.init();
        console.log("initialised sender crux wallet");

        console.log("initialising reciever crux wallet");
        localStorage.setItem('payIDClaim', JSON.stringify({"identitySecrets":"{\"iv\":\"Zeww9POcmRieL9ik\",\"encBuffer\":\"a7wuD79VAQ7nugbow2+m5O7UosexhLx9lS6993Ov4/CmrpnSVaWXPPAOOOA7pHE73Iz53bAs7rn3iFf4BOSf5GnvZZ7QR/5nyA1Xy3hNWSfxzwPfJQUcQpHrAuAxMOFe8a1vbNMATzPpU4YRTETjSOG2peGVM35dFYNNkO96/FRfOgAQ4tlFLPwgxwuiR7mZMgOGUN+lMWBynSn/moxnqE81osm2Ezv5ROEhENyHS8UnTF9TC5qtPHkkDg2y2Nuu4zsVr8szItaMvw7VueFxR2g8hTUTFNrWYxe/hBmb6nLW2I6TBBVId9fjQhcQK0PMshMpoDxJZamn321XxnRhR55HllTQQWQsejyhHMlfrF2ueypyQsp+o7ATBpHJxwVXx8WmW0TSvhB9MGg+PfROP1pPMM5GDEjJRPNF4g689DoA/PDZwrLtAz6ojg==\"}","virtualAddress":"amit@cruxdev.crux"}))
        recieverCruxWallet = new CruxClient(walletOptions);
        await recieverCruxWallet.init();
        console.log("initialised reciever crux wallet");

        console.log("checking if the sender and the reciever wallet are initiailised properly")
        assert.instanceOf(senderCruxWallet._cruxUser, CruxUser);
        assert.instanceOf(recieverCruxWallet._cruxUser, CruxUser)
    });
    
})