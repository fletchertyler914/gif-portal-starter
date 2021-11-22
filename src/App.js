import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import idl from './idl.json';
import kp from './keypair.json';

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
let baseAccount = Keypair.generate();

// For testing lcoally, use the keypair from the keypair.json file.
// const arr = Object.values(kp._keypair.secretKey);
// const secret = new Uint8Array(arr);
// const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: 'processed',
};

// import { Grid } from '@giphy/react-components';
// import { GiphyFetch } from '@giphy/js-fetch-api';

// apply for a new Web SDK key. Use a separate key for every platform (Android, iOS, Web)
// const gf = new GiphyFetch('4114lOb5M4EIb4AJ9oqsjfQLphr4KmaP');
// const searchTerm = 'dogs';
// const fetchGifs = (offset) => gf.search(searchTerm, { offset, limit: 10 });

// Constants
const TWITTER_HANDLE = 'firecrab_';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// const TEST_GIFS = [
//   'https://media.giphy.com/media/wgH3eRXvq56vSiDldb/giphy.gif',
//   'https://media.giphy.com/media/2TT7wW9nMWK3uFVSaN/giphy.gif',
//   'https://media.giphy.com/media/ITRemFlr5tS39AzQUL/giphy.gif',
//   'https://media.giphy.com/media/3ohhwhS1VY3Rm3w0Ew/giphy.gif',
//   'https://media.giphy.com/media/10nvtGzd3vSDYY/giphy.gif',
//   'https://media.giphy.com/media/nfh0brn7xRvZ2eCcVO/giphy.gif',
//   'https://media.giphy.com/media/rhE53ChkBjqWsB5gU5/giphy.gif',
//   'https://media.giphy.com/media/ahsyCsQXB9f5h1lMJg/giphy.gif',
//   'https://media.giphy.com/media/bVQYwRLjWXhJK/giphy.gif',
//   'https://media.giphy.com/media/xTiTnkx42MemFHyCPe/giphy.gif',
//   'https://media.giphy.com/media/3og0IJH6FnGaivoCgo/giphy.gif',
//   'https://media.giphy.com/media/13V39mKwsXzGy4/giphy.gif',
// ];

const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const checkIfWalletConnected = async () => {
    try {
      const { solana } = window;
      if (solana.isPhantom) {
        console.log('Phantom wallet found!');
        /*
         * The solana object gives us a function that will allow us to connect
         * directly with the user's wallet!
         */
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(
          'Connected with Public Key:',
          response.publicKey.toString()
        );

        /*
         * Set the user's publicKey in state to be used later!
         */
        setWalletAddress(response.publicKey.toString());
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link given!');
      return;
    }
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
      console.log('GIF successfully sent to program', inputValue);

      await getGifList();
    } catch (error) {
      console.log('Error sending GIF:', error);
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log('ping');
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        'Created a new BaseAccount w/ address:',
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log('Error creating BaseAccount account:', error);
    }
  };

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <button
      className='cta-button connect-wallet-button'
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className='connected-container'>
          <button
            className='cta-button submit-gif-button'
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className='connected-container'>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type='text'
              placeholder='Enter gif link!'
              value={inputValue}
              onChange={onInputChange}
            />
            <button type='submit' className='cta-button submit-gif-button'>
              Submit
            </button>
          </form>
          <div className='gif-grid'>
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className='gif-item' key={index}>
                <img src={item.gifLink} alt='' />
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  // const renderGiphyGrid = () => (
  //   <div className='connected-container'>
  //     <Grid width={800} columns={3} fetchGifs={fetchGifs} key={searchTerm} />
  //   </div>
  // );

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => await checkIfWalletConnected();
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log('Got the account', account);
      setGifList(account.gifList);
    } catch (error) {
      console.log('Error in getGifList: ', error);
      setGifList(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList();
      // setGifList(TEST_GIFS);
    }
  }, [walletAddress]);

  return (
    <div className='App'>
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className='header-container'>
          <p className='header'>Portal</p>
          <p className='sub-text'>a GIF collection in the metaverse.</p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
          {/* {walletAddress && renderGiphyGrid()} */}
        </div>
        <div className='footer-container'>
          <img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
          <a
            className='footer-text'
            href={TWITTER_LINK}
            target='_blank'
            rel='noreferrer'
          >{`@${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
