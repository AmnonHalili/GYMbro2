import React, { useState } from 'react';
import * as aiService from '../services/aiService';
import { NutritionAdviceRequest } from '../types';

const NutritionAdvice: React.FC = () => {
  const [formData, setFormData] = useState<NutritionAdviceRequest>({
    goal: '',
    dietaryRestrictions: '',
    currentWeight: 70,
    targetWeight: 70
  });
  
  const [nutritionAdvice, setNutritionAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: ['currentWeight', 'targetWeight'].includes(name) ? parseFloat(value) : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiService.generateNutritionAdvice(formData);
      setNutritionAdvice(response.nutritionAdvice);
    } catch (error) {
      console.error('Error generating nutrition advice:', error);
      setError('אירעה שגיאה בהפקת ייעוץ התזונה. אנא נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nutrition-advice-container">
      <h2 className="ai-title">יועץ תזונה</h2>
      <p className="ai-description">
        מלא את הפרטים כדי לקבל המלצות תזונה מותאמות אישית בהתאם למטרות ולהעדפות שלך.
      </p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="ai-form-container">
        <form className="ai-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="goal">מטרה תזונתית</label>
            <input
              type="text"
              id="goal"
              name="goal"
              className="form-control"
              value={formData.goal}
              onChange={handleChange}
              placeholder="לדוגמה: ירידה במשקל, עלייה במסת שריר, תזונה בריאה יותר"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="dietaryRestrictions">הגבלות תזונתיות</label>
            <textarea
              id="dietaryRestrictions"
              name="dietaryRestrictions"
              className="form-control"
              value={formData.dietaryRestrictions}
              onChange={handleChange}
              placeholder="לדוגמה: צמחוני, טבעוני, ללא גלוטן, אלרגיות"
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="currentWeight">משקל נוכחי (ק"ג)</label>
            <input
              type="number"
              id="currentWeight"
              name="currentWeight"
              className="form-control"
              value={formData.currentWeight}
              onChange={handleChange}
              min={20}
              step={0.1}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="targetWeight">משקל יעד (ק"ג)</label>
            <input
              type="number"
              id="targetWeight"
              name="targetWeight"
              className="form-control"
              value={formData.targetWeight}
              onChange={handleChange}
              min={20}
              step={0.1}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? 'מייצר המלצות...' : 'קבל ייעוץ תזונתי'}
          </button>
        </form>
      </div>
      
      {nutritionAdvice && (
        <div className="ai-result">
          <h3>המלצות התזונה שלך</h3>
          <div className="nutrition-advice">
            {nutritionAdvice}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionAdvice; 