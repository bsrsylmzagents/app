import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const SeasonalPrices = () => {
  const [prices, setPrices] = useState([]);
  
  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await axios.get(`${API}/seasonal-prices`);
      setPrices(response.data);
    } catch (error) {
      toast.error('Fiyatlar yüklenemedi');
    }
  };

  return (
    <div className="space-y-6" data-testid="seasonal-prices-page">
      <h1 className="text-3xl font-bold text-white">Dönemsel Fiyatlar</h1>
      <p className="text-gray-400">Dönemsel fiyat yönetimi geliştiriliyor...</p>
    </div>
  );
};

export default SeasonalPrices;
