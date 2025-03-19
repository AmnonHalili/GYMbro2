import React, { useState } from 'react';
import { aiService } from '../services/aiService';
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
    saturatedFat?: string;
    fiber?: string;
    sugars?: string;
    sodium?: string;
    cholesterol?: string;
    vitamins?: string[] | string;
    minerals?: string[] | string;
    allergies?: string[] | string;
    rawText?: string;
    [key: string]: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  
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
      console.log('[NutritionalCalculator] Sending request with food items:', request.foodItems.join(", "));
      
      const response = await aiService.calculateNutrition(request.foodItems.join(", "));
      console.log('[NutritionalCalculator] Received response:', response);
      
      // וידוא שקיים אובייקט nutritionalValues ושהוא לא ריק
      if (response && response.nutritionalValues && Object.keys(response.nutritionalValues).length > 0) {
        setNutritionalValues(response.nutritionalValues);
      } else if (response && response.nutritionInfo && Object.keys(response.nutritionInfo).length > 0) {
        // גיבוי למקרה שמוחזר רק nutritionInfo
        setNutritionalValues(response.nutritionInfo);
      } else {
        console.warn('[NutritionalCalculator] API returned empty or invalid response:', response);
        setError('לא התקבלו ערכים תזונתיים מהשרת. נסה לשנות את תיאור המזון או נסה שוב מאוחר יותר.');
        // אובייקט ריק שתואם את המבנה המצופה
        setNutritionalValues({
          calories: 0,
          protein: "0g",
          carbs: "0g",
          fat: "0g"
        });
      }
      
      // בעת קבלת תוצאות חדשות, נגלול אוטומטית לחלק התוצאות
      setTimeout(() => {
        const resultsElement = document.getElementById('nutrition-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    } catch (error: any) {
      console.error('[NutritionalCalculator] Error calculating nutritional values:', error);
      setError(error.message || 'אירעה שגיאה בעת חישוב הערכים התזונתיים');
      setNutritionalValues(null);
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
        <div className="ai-result" id="nutrition-results">
          <h3>ערכים תזונתיים</h3>
          <div className="nutritional-values">
            {Object.keys(nutritionalValues).length === 0 ? (
              <p className="text-warning">לא נמצאו ערכים תזונתיים עבור המזונות שהוזנו.</p>
            ) : (
              <div className="nutrition-table">
                {nutritionalValues.calories && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">קלוריות:</div>
                    <div className="nutrition-value">{nutritionalValues.calories}</div>
                  </div>
                )}
                {nutritionalValues.protein && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">חלבון:</div>
                    <div className="nutrition-value">{nutritionalValues.protein}</div>
                  </div>
                )}
                {nutritionalValues.carbs && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">פחמימות:</div>
                    <div className="nutrition-value">{nutritionalValues.carbs}</div>
                  </div>
                )}
                {nutritionalValues.fat && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">שומן:</div>
                    <div className="nutrition-value">{nutritionalValues.fat}</div>
                  </div>
                )}
                {nutritionalValues.saturatedFat && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">שומן רווי:</div>
                    <div className="nutrition-value">{nutritionalValues.saturatedFat}</div>
                  </div>
                )}
                {nutritionalValues.fiber && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">סיבים תזונתיים:</div>
                    <div className="nutrition-value">{nutritionalValues.fiber}</div>
                  </div>
                )}
                {nutritionalValues.sugars && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">סוכרים:</div>
                    <div className="nutrition-value">{nutritionalValues.sugars}</div>
                  </div>
                )}
                {nutritionalValues.sodium && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">נתרן:</div>
                    <div className="nutrition-value">{nutritionalValues.sodium}</div>
                  </div>
                )}
                {nutritionalValues.cholesterol && (
                  <div className="nutrition-row">
                    <div className="nutrition-label">כולסטרול:</div>
                    <div className="nutrition-value">{nutritionalValues.cholesterol}</div>
                  </div>
                )}
                
                {/* הצגת ויטמינים אם קיימים */}
                {nutritionalValues.vitamins && (
                  <div className="nutrition-row nutrition-section">
                    <div className="nutrition-label">ויטמינים:</div>
                    <div className="nutrition-value">
                      {Array.isArray(nutritionalValues.vitamins) 
                        ? nutritionalValues.vitamins.join(', ')
                        : nutritionalValues.vitamins}
                    </div>
                  </div>
                )}
                
                {/* הצגת מינרלים אם קיימים */}
                {nutritionalValues.minerals && (
                  <div className="nutrition-row nutrition-section">
                    <div className="nutrition-label">מינרלים:</div>
                    <div className="nutrition-value">
                      {Array.isArray(nutritionalValues.minerals) 
                        ? nutritionalValues.minerals.join(', ')
                        : nutritionalValues.minerals}
                    </div>
                  </div>
                )}
                
                {/* הצגת אלרגיות אם קיימות */}
                {nutritionalValues.allergies && (
                  <div className="nutrition-row nutrition-section alert-info">
                    <div className="nutrition-label">אלרגיות:</div>
                    <div className="nutrition-value">
                      {Array.isArray(nutritionalValues.allergies) 
                        ? nutritionalValues.allergies.join(', ')
                        : nutritionalValues.allergies}
                    </div>
                  </div>
                )}
                
                {/* הצגת ערכים נוספים אם קיימים */}
                {Object.entries(nutritionalValues)
                  .filter(([key]) => !['calories', 'protein', 'carbs', 'fat', 'fiber', 
                                       'saturatedFat', 'sugars', 'sodium', 'cholesterol', 
                                       'vitamins', 'minerals', 'allergies', 'rawText'].includes(key))
                  .map(([key, value]) => (
                    <div className="nutrition-row" key={key}>
                      <div className="nutrition-label">{key}:</div>
                      <div className="nutrition-value">{value}</div>
                    </div>
                  ))
                }
                
                {/* הצגת הטקסט הגולמי אם קיים */}
                {nutritionalValues.rawText && (
                  <div className="raw-data-container">
                    <button 
                      className="btn btn-sm btn-outline-secondary mt-3"
                      onClick={() => setShowRawData(!showRawData)}
                    >
                      {showRawData ? 'הסתר מידע גולמי' : 'הצג מידע גולמי מלא'}
                    </button>
                    
                    {showRawData && (
                      <div className="raw-data mt-2 p-3 bg-light rounded">
                        <pre className="mb-0">{nutritionalValues.rawText}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

 