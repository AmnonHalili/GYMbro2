import React, { useState } from 'react';
import * as aiService from '../services/aiService';
import { WorkoutPlanRequest } from '../types';

const WorkoutPlanner: React.FC = () => {
  const [formData, setFormData] = useState<WorkoutPlanRequest>({
    level: 'beginner',
    goal: '',
    daysPerWeek: 3,
    preferences: ''
  });
  
  const [workoutPlan, setWorkoutPlan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'daysPerWeek' ? parseInt(value) : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiService.generateWorkoutPlan(formData);
      setWorkoutPlan(response.workoutPlan);
    } catch (error) {
      console.error('Error generating workout plan:', error);
      setError('אירעה שגיאה בהפקת תוכנית האימון. אנא נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workout-planner-container">
      <h2 className="ai-title">מתכנן תוכניות אימון</h2>
      <p className="ai-description">
        מלא את הפרטים כדי לקבל תוכנית אימון מותאמת אישית בהתאם לרמה ולמטרות שלך.
      </p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="ai-form-container">
        <form className="ai-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="level">רמת כושר</label>
            <select
              id="level"
              name="level"
              className="form-control"
              value={formData.level}
              onChange={handleChange}
              required
            >
              <option value="beginner">מתחיל</option>
              <option value="intermediate">בינוני</option>
              <option value="advanced">מתקדם</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="goal">מטרה</label>
            <input
              type="text"
              id="goal"
              name="goal"
              className="form-control"
              value={formData.goal}
              onChange={handleChange}
              placeholder="לדוגמה: חיזוק שרירים, הרזיה, סיבולת לב-ריאה"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="daysPerWeek">ימי אימון בשבוע</label>
            <input
              type="number"
              id="daysPerWeek"
              name="daysPerWeek"
              className="form-control"
              value={formData.daysPerWeek}
              onChange={handleChange}
              min={1}
              max={7}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="preferences">העדפות או מגבלות</label>
            <textarea
              id="preferences"
              name="preferences"
              className="form-control"
              value={formData.preferences}
              onChange={handleChange}
              placeholder="לדוגמה: אימון בבית, בעיות גב/ברכיים, ציוד זמין"
              rows={3}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? 'מייצר תוכנית...' : 'צור תוכנית אימון'}
          </button>
        </form>
      </div>
      
      {workoutPlan && (
        <div className="ai-result">
          <h3>תוכנית האימון שלך</h3>
          <div className="workout-plan">
            {workoutPlan}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutPlanner; 