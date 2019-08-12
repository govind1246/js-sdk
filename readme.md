Run sample file:
```
npm i && npm run sample
```

#Interfaces:

##Common:

Initialising the peer instance (currently both wallet and service):


```js
import { OpenPayPeer } from 'openpay';

let wallet =  new OpenPayPeer()

```


* isActive() -> Boolean (is the peer connected to the signalling server)
* isListening() -> Boolean (any open channels)
* hasPayIDClaim() -> Boolean (does the client identify locally stored PayIDClaim)
* getPayIDClaim() -> PayIDClaim currently in use
* addPayIDClaim() -> Set the new/modified PayIDClaim (name && passcode)


##Wallet specific:

Initialising the wallet instance: 

```js
import { OpenPayWallet } from 'openpay';

let wallet =  new OpenPayWallet()

```

* activateListener() -> Open the peer connection with Signalling Server
* request -> Event emitted on new Payment Request as defined


##Service specific:

Initialising the service instance:

```js
import { OpenPayService } from 'openpay';

let service = new OpenPayService()
```

* sendPaymentRequest() -> Push a new payment Request to the Virtual address specified with their receiving passcode.
