// Frontend - EnergyMarketplace.js
import React, { useState, useEffect } from 'react';
import { AlertCircle, Sun, Battery } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Web3 from 'web3';

const API_BASE_URL = 'http://localhost:5001/api';

const RECEIVER_ADDRESSES = [
  '0x606aBa42A91bE87c061C20ba52b1C2a9ACe96096',
  '0x1e671B9F7F295B3EdCb03375F522F31CB9b83780',
  '0xE4BDA2cdD0BCAE978654D3d1dcefFe8F5B674f95',
  '0x1E5CF5f4f260EDffeBd6d933b7D4BCcC392EA29B',
  '0xa7f43130D7C983e3648Ec8b29920B9CDB66d085D',
  '0xC1Ce24b50C088848820638e03D7Cd196867508B8',
  '0x41080Dc0beA1811AeaD58A5C1AB48dB3ADA405FF',
  '0x79C4dB39F340938bB2Cc1e534FDA9Bfd28796322',
  '0xa45691373fEA0aF580BC26A0B0feEd2E3427E5C1'
];

const EnergyMarketplace = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [isProducer, setIsProducer] = useState(false);
  const [energyOffers, setEnergyOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEnergyOffers();
  }, []);

  const fetchEnergyOffers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/energy-offers`);
      const data = await response.json();
      setEnergyOffers(data);
    } catch (err) {
      setError('Failed to fetch energy offers');
    }
  };

  const initWeb3 = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this application');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3Instance = new Web3(window.ethereum);
      const accounts = await web3Instance.eth.getAccounts();
      
      setWeb3(web3Instance);
      setAccount(accounts[0]);

      window.ethereum.on('accountsChanged', accounts => setAccount(accounts[0]));
      window.ethereum.on('chainChanged', () => window.location.reload());
    } catch (err) {
      setError(err.message);
    }
  };

  const EnergyListingForm = () => {
    const [listingData, setListingData] = useState({
      price: '',
      energyAmount: '',
      duration: '24'
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const priceInWei = web3.utils.toWei(listingData.price, 'ether');
        
        const response = await fetch(`${API_BASE_URL}/list-energy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            price: priceInWei,
            energyAmount: listingData.energyAmount,
            duration: listingData.duration,
            producer: account
          })
        });

        if (!response.ok) throw new Error('Failed to list energy');
        
        setListingData({ price: '', energyAmount: '', duration: '24' });
        fetchEnergyOffers();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            List Energy for Sale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price (ETH)</label>
              <input
                type="number"
                step="0.001"
                className="w-full p-2 border rounded"
                value={listingData.price}
                onChange={(e) => setListingData({...listingData, price: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Energy Amount (kWh)</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={listingData.energyAmount}
                onChange={(e) => setListingData({...listingData, energyAmount: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (hours)</label>
              <select
                className="w-full p-2 border rounded"
                value={listingData.duration}
                onChange={(e) => setListingData({...listingData, duration: e.target.value})}
              >
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'List Energy'}
            </button>
          </form>
        </CardContent>
      </Card>
    );
  };

  const EnergyOfferCard = ({ offer }) => {
    const handlePurchase = async () => {
      if (!account) {
        setError("Please connect your wallet first");
        return;
      }
      
      setLoading(true);
      try {
        const tx = {
          from: account,
          to: RECEIVER_ADDRESSES[Math.floor(Math.random() * RECEIVER_ADDRESSES.length)],
          value: offer.priceInWei,
          gas: '21000'
        };
        
        await web3.eth.sendTransaction(tx);
        
        const response = await fetch(`${API_BASE_URL}/purchase-energy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerId: offer.offerId,
            amount: 1,
            buyer: account
          })
        });

        if (!response.ok) throw new Error('Purchase failed');
        
        fetchEnergyOffers();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{web3?.utils.fromWei(offer.priceInWei, 'ether')} ETH</h3>
              <p className="text-sm text-gray-600">{offer.energyAmount} kWh available</p>
            </div>
            <Battery className="h-6 w-6 text-green-500" />
          </div>
          <div className="space-y-2">
            <p className="text-sm">Producer: {offer.producer.slice(0, 6)}...{offer.producer.slice(-4)}</p>
            <p className="text-sm">Listed: {new Date(offer.timestamp).toLocaleDateString()}</p>
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full mt-4 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Purchase Energy'}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Sun className="h-8 w-8 text-yellow-500" />
              <span className="ml-2 text-xl font-bold">Energy Marketplace</span>
            </div>
            <div className="flex items-center space-x-4">
              {account ? (
                <>
                  <span className="text-sm text-gray-600">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <button
                    onClick={() => setIsProducer(!isProducer)}
                    className="text-sm bg-gray-100 px-3 py-2 rounded"
                  >
                    {isProducer ? 'Switch to Consumer' : 'Switch to Producer'}
                  </button>
                </>
              ) : (
                <button
                  onClick={initWeb3}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isProducer ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Producer Dashboard</h2>
            <EnergyListingForm />
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Available Energy Offers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {energyOffers.map((offer) => (
                <EnergyOfferCard key={offer.offerId} offer={offer} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EnergyMarketplace;