import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaAppleAlt, FaWeight, FaRunning, FaUtensils, FaDownload, FaShareAlt, FaCheckCircle, FaDumbbell } from 'react-icons/fa';
import { GiMeat, GiWheat } from 'react-icons/gi';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/aiService';
import { NutritionAdviceRequest } from '../types';
import '../styles/AiFeatures.css';

// Helper component for icons
const IconComponent = ({ Icon }: { Icon: any }) => <Icon />;

const NutritionAdvice: React.FC = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<NutritionAdviceRequest>({
    age: 30,
    weight: 70,
    height: 170,
    activityLevel: 'moderate',
    dietaryPreferences: 'balanced',
    healthGoals: 'maintain',
    existingConditions: '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof NutritionAdviceRequest, string>> & { general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nutritionAdvice, setNutritionAdvice] = useState<string | null>(null);
  const [adviceGenerated, setAdviceGenerated] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [calories, setCalories] = useState<number | null>(null);

  useEffect(() => {
    if (!authState.isAuthenticated) {
      navigate('/login');
    }
  }, [authState.isAuthenticated, navigate]);

  // Calculate approximate calories based on formData
  useEffect(() => {
    // Basic BMR calculation (Harris-Benedict equation)
    let bmr = 0;
    if (formData.height && formData.weight && formData.age) {
      // For males (simplified for example)
      bmr = 88.362 + (13.397 * formData.weight) + (4.799 * formData.height) - (5.677 * formData.age);
      
      // Activity multiplier
      let activityMultiplier = 1.2; // Sedentary
      if (formData.activityLevel === 'light') activityMultiplier = 1.375;
      else if (formData.activityLevel === 'moderate') activityMultiplier = 1.55;
      else if (formData.activityLevel === 'high') activityMultiplier = 1.725;
      else if (formData.activityLevel === 'very_high') activityMultiplier = 1.9;
      
      // Goal adjustment
      let goalMultiplier = 1;
      if (formData.healthGoals === 'lose') goalMultiplier = 0.8;
      else if (formData.healthGoals === 'gain') goalMultiplier = 1.2;
      
      setCalories(Math.round(bmr * activityMultiplier * goalMultiplier));
    }
  }, [formData]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof NutritionAdviceRequest, string>> = {};
    
    if (!formData.age || formData.age < 16 || formData.age > 100) {
      newErrors.age = 'גיל חייב להיות בין 16 ל-100';
    }
    
    if (!formData.weight || formData.weight < 30 || formData.weight > 250) {
      newErrors.weight = 'משקל חייב להיות בין 30 ל-250 ק"ג';
    }
    
    if (!formData.height || formData.height < 120 || formData.height > 220) {
      newErrors.height = 'גובה חייב להיות בין 120 ל-220 ס"מ';
    }
    
    if (!formData.activityLevel) {
      newErrors.activityLevel = 'נא לבחור רמת פעילות';
    }
    
    if (!formData.dietaryPreferences) {
      newErrors.dietaryPreferences = 'נא לבחור העדפות תזונה';
    }
    
    if (!formData.healthGoals) {
      newErrors.healthGoals = 'נא לבחור מטרה בריאותית';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'age' || name === 'weight' || name === 'height') {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        setFormData(prev => ({
          ...prev,
          [name]: numValue
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const incrementValue = (field: 'age' | 'weight' | 'height') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] + (field === 'age' ? 1 : field === 'weight' ? 0.5 : 1)
    }));
  };

  const decrementValue = (field: 'age' | 'weight' | 'height') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] - (field === 'age' ? 1 : field === 'weight' ? 0.5 : 1)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const advice = await aiService.generateNutritionAdvice(formData);
      setNutritionAdvice(advice);
      setAdviceGenerated(true);
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('nutrition-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    } catch (error: any) {
      console.error('Error generating nutrition advice:', error);
      setErrors({
        general: error.message || 'אירעה שגיאה בעת יצירת המלצות התזונה. נא לנסות שוב מאוחר יותר.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadNutritionAdvice = () => {
    if (!nutritionAdvice) return;
    
    const element = document.createElement('a');
    const file = new Blob([nutritionAdvice], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `המלצות_תזונה_${new Date().toLocaleDateString('he-IL').replace(/\./g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const shareNutritionAdvice = async () => {
    if (!nutritionAdvice) return;
    
    try {
      await navigator.clipboard.writeText(nutritionAdvice);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Container className="mt-4 mb-5 rtl">
      <div className="ai-container fade-in">
        <h1 className="ai-title">ייעוץ תזונה אישי</h1>
        <p className="ai-description">
          מלא את הפרטים הבאים לקבלת המלצות תזונה מותאמות אישית מבוססות בינה מלאכותית,
          המתחשבות בגיל, משקל, פעילות גופנית ומטרות בריאותיות.
        </p>

        {errors.general && (
          <Alert variant="danger" className="text-center">
            {errors.general}
          </Alert>
        )}

        <div className="ai-form-container">
          <Form onSubmit={handleSubmit} className="ai-form">
            <div className="form-row">
              <div className="form-group">
                <Form.Label>גיל</Form.Label>
                <div className="number-input-container">
                  <div 
                    className="number-btn minus" 
                    onClick={() => decrementValue('age')}
                  >
                    -
                  </div>
                  <input
                    type="number"
                    name="age"
                    className={`form-control number-input ${errors.age ? 'is-invalid' : ''}`}
                    value={formData.age}
                    onChange={handleInputChange}
                    min={16}
                    max={100}
                  />
                  <div 
                    className="number-btn plus" 
                    onClick={() => incrementValue('age')}
                  >
                    +
                  </div>
                </div>
                {errors.age && <div className="invalid-feedback d-block">{errors.age}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <Form.Label>משקל (ק"ג)</Form.Label>
                <div className="number-input-container">
                  <div 
                    className="number-btn minus" 
                    onClick={() => decrementValue('weight')}
                  >
                    -
                  </div>
                  <input
                    type="number"
                    name="weight"
                    className={`form-control number-input ${errors.weight ? 'is-invalid' : ''}`}
                    value={formData.weight}
                    onChange={handleInputChange}
                    min={30}
                    max={250}
                    step="0.5"
                  />
                  <div 
                    className="number-btn plus" 
                    onClick={() => incrementValue('weight')}
                  >
                    +
                  </div>
                </div>
                {errors.weight && <div className="invalid-feedback d-block">{errors.weight}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <Form.Label>גובה (ס"מ)</Form.Label>
                <div className="number-input-container">
                  <div 
                    className="number-btn minus" 
                    onClick={() => decrementValue('height')}
                  >
                    -
                  </div>
                  <input
                    type="number"
                    name="height"
                    className={`form-control number-input ${errors.height ? 'is-invalid' : ''}`}
                    value={formData.height}
                    onChange={handleInputChange}
                    min={120}
                    max={220}
                  />
                  <div 
                    className="number-btn plus" 
                    onClick={() => incrementValue('height')}
                  >
                    +
                  </div>
                </div>
                {errors.height && <div className="invalid-feedback d-block">{errors.height}</div>}
              </div>
            </div>

            <div className="form-group">
              <Form.Label>רמת פעילות גופנית</Form.Label>
              <Form.Select 
                name="activityLevel" 
                value={formData.activityLevel}
                onChange={handleInputChange}
                className={`form-control ${errors.activityLevel ? 'is-invalid' : ''}`}
              >
                <option value="sedentary">יושבני (מעט או ללא פעילות)</option>
                <option value="light">קלה (1-3 ימי אימון בשבוע)</option>
                <option value="moderate">בינונית (3-5 ימי אימון בשבוע)</option>
                <option value="high">גבוהה (6-7 ימי אימון בשבוע)</option>
                <option value="very_high">גבוהה מאוד (אימונים מרובים ביום)</option>
              </Form.Select>
              {errors.activityLevel && <div className="invalid-feedback">{errors.activityLevel}</div>}
            </div>

            <div className="form-group">
              <Form.Label>העדפות תזונה</Form.Label>
              <div className="diet-options-container fitness-level-container">
                <div className="fitness-level-option">
                  <input
                    type="radio"
                    id="diet-balanced"
                    name="dietaryPreferences"
                    value="balanced"
                    checked={formData.dietaryPreferences === 'balanced'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="diet-balanced">
                    <div className="fitness-level-icon"><IconComponent Icon={FaUtensils} /></div>
                    <div className="fitness-level-title">תזונה מאוזנת</div>
                    <div className="fitness-level-desc">תזונה מגוונת המשלבת את כל אבות המזון</div>
                  </label>
                </div>
                <div className="fitness-level-option">
                  <input
                    type="radio"
                    id="diet-vegetarian"
                    name="dietaryPreferences"
                    value="vegetarian"
                    checked={formData.dietaryPreferences === 'vegetarian'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="diet-vegetarian">
                    <div className="fitness-level-icon"><IconComponent Icon={FaAppleAlt} /></div>
                    <div className="fitness-level-title">צמחוני</div>
                    <div className="fitness-level-desc">ללא בשר, עם מוצרי חלב וביצים</div>
                  </label>
                </div>
                <div className="fitness-level-option">
                  <input
                    type="radio"
                    id="diet-vegan"
                    name="dietaryPreferences"
                    value="vegan"
                    checked={formData.dietaryPreferences === 'vegan'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="diet-vegan">
                    <div className="fitness-level-icon"><IconComponent Icon={GiWheat} /></div>
                    <div className="fitness-level-title">טבעוני</div>
                    <div className="fitness-level-desc">ללא מוצרים מן החי</div>
                  </label>
                </div>
                <div className="fitness-level-option">
                  <input
                    type="radio"
                    id="diet-high-protein"
                    name="dietaryPreferences"
                    value="high_protein"
                    checked={formData.dietaryPreferences === 'high_protein'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="diet-high-protein">
                    <div className="fitness-level-icon"><IconComponent Icon={GiMeat} /></div>
                    <div className="fitness-level-title">עתיר חלבון</div>
                    <div className="fitness-level-desc">דגש על מזונות עשירים בחלבון</div>
                  </label>
                </div>
              </div>
              {errors.dietaryPreferences && <div className="invalid-feedback d-block">{errors.dietaryPreferences}</div>}
            </div>

            <div className="form-group">
              <Form.Label>מטרה בריאותית</Form.Label>
              <div className="health-goals-container fitness-level-container">
                <div className="fitness-level-option">
                  <input
                    type="radio"
                    id="goal-lose"
                    name="healthGoals"
                    value="lose"
                    checked={formData.healthGoals === 'lose'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="goal-lose">
                    <div className="fitness-level-icon"><IconComponent Icon={FaWeight} /></div>
                    <div className="fitness-level-title">הרזיה</div>
                    <div className="fitness-level-desc">הפחתת אחוזי שומן</div>
                  </label>
                </div>
                <div className="fitness-level-option">
                  <input
                    type="radio"
                    id="goal-maintain"
                    name="healthGoals"
                    value="maintain"
                    checked={formData.healthGoals === 'maintain'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="goal-maintain">
                    <div className="fitness-level-icon"><IconComponent Icon={FaRunning} /></div>
                    <div className="fitness-level-title">שמירה</div>
                    <div className="fitness-level-desc">שמירה על משקל נוכחי</div>
                  </label>
                </div>
                <div className="fitness-level-option">
                  <input
                    type="radio"
                    id="goal-gain"
                    name="healthGoals"
                    value="gain"
                    checked={formData.healthGoals === 'gain'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="goal-gain">
                    <div className="fitness-level-icon"><IconComponent Icon={FaDumbbell} /></div>
                    <div className="fitness-level-title">עלייה במסה</div>
                    <div className="fitness-level-desc">בניית מסת שריר</div>
                  </label>
                </div>
              </div>
              {errors.healthGoals && <div className="invalid-feedback d-block">{errors.healthGoals}</div>}
            </div>

            <div className="form-group">
              <Form.Label>
                מצבים בריאותיים (אופציונלי)
                <div className="tooltip d-inline-block">
                  <span className="tooltip-icon me-2">?</span>
                  <span className="tooltip-text">
                    למשל: סוכרת, יתר לחץ דם, רגישויות או אלרגיות
                  </span>
                </div>
              </Form.Label>
              <Form.Control
                as="textarea"
                name="existingConditions"
                value={formData.existingConditions}
                onChange={handleInputChange}
                placeholder="פרט מצבים בריאותיים, אלרגיות או רגישויות"
                className="form-control"
                rows={3}
              />
            </div>

            {calories && (
              <div className="calories-estimate fade-in">
                <div className="calories-label">הערכת קלוריות יומית:</div>
                <div className="calories-value">{calories.toLocaleString()} קלוריות</div>
                <div className="calories-note">*הערכה כללית בלבד, המלצות מדויקות יופיעו בתוכנית</div>
              </div>
            )}

            <Button 
              type="submit" 
              className="ai-submit-btn" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'מייצר המלצות...' : 'יצירת תוכנית תזונה'}
            </Button>
          </Form>
        </div>

        {isSubmitting && (
          <div className="ai-loading">
            <div className="ai-loading-spinner"></div>
            <div className="ai-loading-text">מייצר המלצות תזונה מותאמות אישית...</div>
          </div>
        )}

        {adviceGenerated && nutritionAdvice && (
          <div id="nutrition-results" className="ai-result fade-in">
            <h3>המלצות התזונה שלך</h3>
            <div className="nutrition-advice">
              <ReactMarkdown>{nutritionAdvice}</ReactMarkdown>
            </div>
            <div className="ai-result-actions">
              <button 
                className="ai-result-btn" 
                onClick={downloadNutritionAdvice}
              >
                הורדת ההמלצות <IconComponent Icon={FaDownload} />
              </button>
              <button 
                className="ai-result-btn" 
                onClick={shareNutritionAdvice}
              >
                {shareSuccess ? (
                  <>הועתק ללוח <IconComponent Icon={FaCheckCircle} /></>
                ) : (
                  <>העתקה ללוח <IconComponent Icon={FaShareAlt} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default NutritionAdvice; 