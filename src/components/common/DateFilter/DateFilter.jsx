// Component for switching between today/tomorrow/custom dates
import { useState } from 'react';

const DateFilter = ({ onDateChange, currentRange }) => {
  const [customDate, setCustomDate] = useState(new Date());
  
  const handleRangeChange = (range) => {
    onDateChange(range, customDate);
  };
  
  return (
    <div className="date-filter-container">
      <div className="date-filter-buttons">
        <button 
          className={`date-btn ${currentRange === 'today' ? 'active' : ''}`}
          onClick={() => handleRangeChange('today')}
        >
          📅 Today's Orders
        </button>
        
        <button 
          className={`date-btn ${currentRange === 'tomorrow' ? 'active' : ''}`}
          onClick={() => handleRangeChange('tomorrow')}
        >
          ⏭️ Tomorrow's Orders
        </button>
        
        <div className="custom-date-picker">
          <input 
            type="date" 
            value={customDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              setCustomDate(newDate);
              handleRangeChange('custom');
            }}
          />
          <button 
            className={`date-btn ${currentRange === 'custom' ? 'active' : ''}`}
            onClick={() => handleRangeChange('custom')}
          >
            📆 Custom Date
          </button>
        </div>
      </div>
    </div>
  );
};