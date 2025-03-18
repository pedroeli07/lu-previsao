"use client"
import React from 'react';

const Footer: React.FC = () => {
  // Obter o ano atual para o copyright
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-gray-300 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">
              &copy; {currentYear} ROI Predictor for Poker. Todos os direitos reservados.
            </p>
          </div>
          
          <div className="flex space-x-4">
            <a 
              href="#" 
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Documentação"
            >
              Documentação
            </a>
            <a 
              href="#" 
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Política de Privacidade"
            >
              Política de Privacidade
            </a>
            <a 
              href="#" 
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Termos de Uso"
            >
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 