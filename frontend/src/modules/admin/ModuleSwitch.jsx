import React, { useState, useEffect } from 'react';
import { ChevronDown, Package } from 'lucide-react';
import axios from 'axios';
import { API } from '../../App';

const ModuleSwitch = ({ onModuleChange }) => {
  const [activeModule, setActiveModule] = useState('tour');
  const [availableModules, setAvailableModules] = useState(['tour']);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchCompanyModules();
  }, []);

  const fetchCompanyModules = async () => {
    try {
      
      const response = await axios.get(`${API}/companies/me`);
      const modules = response.data.company?.modules_enabled || {};
      const enabled = Object.keys(modules).filter(key => modules[key]);
      setAvailableModules(enabled.length > 0 ? enabled : ['tour']);
      
      // Set active module from localStorage or default to first enabled
      const saved = localStorage.getItem('activeModule');
      if (saved && enabled.includes(saved)) {
        setActiveModule(saved);
      } else if (enabled.length > 0) {
        setActiveModule(enabled[0]);
      }
    } catch (error) {
      console.error('Company modules fetch error:', error);
    }
  };

  const handleModuleChange = (module) => {
    setActiveModule(module);
    localStorage.setItem('activeModule', module);
    setDropdownOpen(false);
    if (onModuleChange) {
      onModuleChange(module);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2D2F33] border border-[#3EA6FF]/30 hover:bg-[#3EA6FF]/10 transition-colors"
      >
        <Package size={18} className="text-[#3EA6FF]" />
        <span className="text-white capitalize">{activeModule}</span>
        <ChevronDown size={16} className="text-[#A5A5A5]" />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg shadow-xl z-50">
          {availableModules.map((module) => (
            <button
              key={module}
              onClick={() => handleModuleChange(module)}
              className={`w-full text-left px-4 py-2 hover:bg-[#3EA6FF]/10 transition-colors ${
                activeModule === module ? 'bg-[#3EA6FF]/20 text-[#3EA6FF]' : 'text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="capitalize">{module}</span>
                {activeModule === module && (
                  <span className="ml-auto text-[#3EA6FF]">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModuleSwitch;

