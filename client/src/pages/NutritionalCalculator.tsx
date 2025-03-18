import React, { useState } from 'react';
import * as aiService from '../services/aiService';
import { NutritionalValuesRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const NutritionalCalculator: React.FC = () => {
  const { authState: { isAuthenticated } } = useAuth();
  const [foodInput, setFoodInput] = useState('');
  const [foodItems, setFoodItems] = useState<string[]>([]);
  const [nutritionalValues, setNutritionalValues] = useState<{
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
    [key: string]: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add food item to the list
  const handleAddFood = () => {
    if (!foodInput.trim()) return;
    
    setFoodItems(prev => [...prev, foodInput.trim()]);
    setFoodInput('');
  };
  
  // Remove food item from the list
  const handleRemoveFood = (index: number) => {
    setFoodItems(prev => prev.filter((_, i) => i !== index));
  };
  
  // Calculate nutritional values
  const handleCalculate = async () => {
    if (foodItems.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const request: NutritionalValuesRequest = { foodItems };
      const response = await aiService.calculateNutrition(request.foodItems.join(", "));
      setNutritionalValues(response.nutritionalValues);
      
      // בעת קבלת תוצאות חדשות, נגלול אוטומטית לחלק התוצאות
      setTimeout(() => {
        const resultsElement = document.getElementById('nutrition-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    } catch (error: any) {
      console.error('Error calculating nutritional values:', error);
      setError(error.message || 'אירעה שגיאה בעת חישוב הערכים התזונתיים');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Enter key press in the input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFood();
    }
  };
  
  // ניקוי כל הפריטים מהרשימה
  const handleClearAll = () => {
    if (foodItems.length > 0) {
      if (window.confirm('האם אתה בטוח שברצונך לנקות את כל רשימת המזונות?')) {
        setFoodItems([]);
        setNutritionalValues(null);
      }
    }
  };

  // נוסיף בדיקה אם המשתמש מחובר
  if (!isAuthenticated) {
    return (
      <div className="nutritional-calculator-container">
        <h2 className="ai-title">מחשבון ערכים תזונתיים</h2>
        <div className="alert alert-info">
          <p>עליך להתחבר כדי לגשת למחשבון הערכים התזונתיים.</p>
          <Link to="/login" className="btn btn-primary">התחבר</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="nutritional-calculator-container">
      <h2 className="ai-title">מחשבון ערכים תזונתיים</h2>
      <p className="ai-description">
        הוסף מזונות כדי לחשב את הערכים התזונתיים המשוערים שלהם.
        הכנס כל פריט בנפרד עם כמות (לדוגמה: "100 גרם חזה עוף" או "כוס אורז מבושל").
      </p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="ai-form-container">
        <div className="ai-form">
          <div className="food-input-container">
            <div className="form-group">
              <label htmlFor="foodInput">הוסף מזון</label>
              <div className="food-input-row">
                <input
                  type="text"
                  id="foodInput"
                  className="form-control"
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="לדוגמה: 100 גרם חזה עוף, כוס אורז מבושל"
                />
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleAddFood}
                  disabled={!foodInput.trim()}
                >
                  הוסף
                </button>
              </div>
            </div>
          </div>
          
          <div className="food-items-list">
            <div className="food-items-header">
              <h4>רשימת המזונות:</h4>
              {foodItems.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleClearAll}
                >
                  נקה הכל
                </button>
              )}
            </div>
            
            {foodItems.length === 0 ? (
              <p className="no-items">עדיין לא נוספו מזונות לרשימה.</p>
            ) : (
              <ul>
                {foodItems.map((item, index) => (
                  <li key={index} className="food-item">
                    <span>{item}</span>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemoveFood(index)}
                      aria-label="הסר פריט"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <button 
            type="button" 
            className="btn btn-primary calculate-btn"
            onClick={handleCalculate}
            disabled={loading || foodItems.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span className="ms-2">מחשב ערכים...</span>
              </>
            ) : 'חשב ערכים תזונתיים'}
          </button>
        </div>
      </div>
      
      {nutritionalValues && (
        <div className="ai-result">
          <h3>ערכים תזונתיים</h3>
          <div className="nutritional-values">
            <pre>{JSON.stringify(nutritionalValues)}</pre>
          </div>
          <div className="result-disclaimer">
            <p className="text-muted small">
              * הערכים המוצגים הם הערכה כללית ועשויים להשתנות. לייעוץ תזונתי מקצועי, פנה לדיאטן/ית.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionalCalculator;

 