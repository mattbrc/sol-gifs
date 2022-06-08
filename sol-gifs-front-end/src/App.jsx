import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import { Buffer } from 'buffer';
import kp from './keypair.json';
window.Buffer = Buffer;

// Constants
const { SystemProgram, Keypair } = web3;
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = { preflightCommitment: "processed" }
const TWITTER_HANDLE = 'matt_brc';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

const TEST_GIFS = [
  'https://media.giphy.com/media/lUrQwGXxSBhjUsPp12/giphy.gif',
  'https://media.giphy.com/media/gxp0ExqkpxPjedtbOw/giphy-downsized-large.gif',
  'https://media.giphy.com/media/MkxUqzY4yRQrXMjp7M/giphy-downsized-large.gif',
  'https://media.giphy.com/media/6oHaBJP1lgYtq/giphy.gif',
  'https://media.giphy.com/media/l41YrVALvZue261Z6/giphy.gif',
  'https://media.giphy.com/media/3oEjI6GbU4T7TWYNJS/giphy.gif'
]

const App = () => {

  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  
  // logic for checking if Phantom wallet is connected
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
  
      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');

          // connect directly to user's wallet
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key',
            response.publicKey.toString()
          );

          // Set user's public key in state
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async() => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with public key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
	  return provider;
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given")
      return
    }
    setInputValue('');
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Gif successfully sent to program", inputValue)

      await getGifList();
    } catch (error) {
      console.log("Error sending gif", error)
    }
  };

  // want to render UI when user hasn't connected
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  )

  const renderConnectedContainer = () => {
  // If we hit this, it means the program account hasn't been initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } 
  	// Otherwise, we're good! Account exists. User can submit GIFs.
  	else {
      return(
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
  					{/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} />
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  // when component first runs, check if we have a connected phantom wallet
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account)
      setGifList(account.gifList)
      
    } catch (error) {
      console.log("error in getGifList: ", error)
      setGifList(null);
    }
  }

  const createGifAccount = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ the address:", baseAccount.publicKey.toString())
      await getGifList();
      
    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }
  
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList()
    }
  }, [walletAddress]);
  
  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">◎ Sol Gifs</p>
          <p className="sub-text">
            Sick gifs on Solana
          </p>
          {/* render connect to wallet button */}
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
