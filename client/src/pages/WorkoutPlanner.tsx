import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaDumbbell, FaRunning, FaWalking, FaPlus, FaMinus, FaDownload, FaShareAlt, FaCheckCircle } from 'react-icons/fa';
import { ImCross } from 'react-icons/im';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/aiService';
import { WorkoutPlanRequest } from '../types';
import '../styles/AiFeatures.css';

// Helper component for icons
const IconComponent = ({ Icon }: { Icon: any }) => <Icon />;

const WorkoutPlanner: React.FC = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<WorkoutPlanRequest>({
    fitnessLevel: 'beginner',
    goals: [],
    daysPerWeek: 3,
    equipment: 'minimal',
  });
  
  const [newGoal, setNewGoal] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof WorkoutPlanRequest, string>> & { general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<string | null>(null);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    if (!authState.isAuthenticated) {
      navigate('/login');
    }
  }, [authState.isAuthenticated, navigate]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof WorkoutPlanRequest, string>> = {};
    
    if (!formData.fitnessLevel) {
      newErrors.fitnessLevel = 'נא לבחור רמת כושר';
    }
    
    if (formData.goals.length === 0) {
      newErrors.goals = 'נא להוסיף לפחות מטרה אחת';
    }
    
    if (formData.daysPerWeek < 1 || formData.daysPerWeek > 7) {
      newErrors.daysPerWeek = 'מספר ימי אימון בשבוע חייב להיות בין 1 ל-7';
    }
    
    if (!formData.equipment) {
      newErrors.equipment = 'נא לבחור סוג ציוד זמין';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddGoal = () => {
    if (newGoal.trim() && !formData.goals.includes(newGoal.trim())) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()],
      }));
      setNewGoal('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGoal();
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g !== goal),
    }));
  };

  const incrementDays = () => {
    if (formData.daysPerWeek < 7) {
      setFormData(prev => ({
        ...prev,
        daysPerWeek: prev.daysPerWeek + 1,
      }));
    }
  };

  const decrementDays = () => {
    if (formData.daysPerWeek > 1) {
      setFormData(prev => ({
        ...prev,
        daysPerWeek: prev.daysPerWeek - 1,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const plan = await aiService.generateWorkoutPlan(formData);
      setWorkoutPlan(plan);
      setPlanGenerated(true);
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('workout-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    } catch (error: any) {
      console.error('Error generating workout plan:', error);
      setErrors({
        general: error.message || 'אירעה שגיאה בעת יצירת תוכנית האימונים. נא לנסות שוב מאוחר יותר.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadWorkoutPlan = () => {
    if (!workoutPlan) return;
    
    const element = document.createElement('a');
    const file = new Blob([workoutPlan], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `תוכנית_אימונים_${new Date().toLocaleDateString('he-IL').replace(/\./g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const shareWorkoutPlan = async () => {
    if (!workoutPlan) return;
    
    try {
      await navigator.clipboard.writeText(workoutPlan);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const FitnessLevelOption = ({ value, title, description, icon }: { value: string, title: string, description: string, icon: React.ReactNode }) => (
    <div className="fitness-level-option">
      <input
        type="radio"
        id={`fitness-${value}`}
        name="fitnessLevel"
        value={value}
        checked={formData.fitnessLevel === value}
        onChange={handleInputChange}
      />
      <label htmlFor={`fitness-${value}`}>
        <div className="fitness-level-icon">{icon}</div>
        <div className="fitness-level-title">{title}</div>
        <div className="fitness-level-desc">{description}</div>
      </label>
    </div>
  );

  return (
    <Container className="mt-4 mb-5 rtl">
      <div className="ai-container fade-in">
        <h1 className="ai-title">תכנון תוכנית אימונים אישית</h1>
        <p className="ai-description">
          מלא את הפרטים הבאים ליצירת תוכנית אימונים מותאמת אישית באמצעות בינה מלאכותית,
          המבוססת על המטרות, רמת הכושר והציוד הזמין שלך.
        </p>

        {errors.general && (
          <Alert variant="danger" className="text-center">
            {errors.general}
          </Alert>
        )}

        <div className="ai-form-container">
          <Form onSubmit={handleSubmit} className="ai-form">
            <div className="form-group">
              <Form.Label>רמת כושר</Form.Label>
              <div className="fitness-level-container">
                <FitnessLevelOption 
                  value="beginner" 
                  title="מתחיל" 
                  description="חדש באימונים או לא התאמנת באופן קבוע" 
                  icon={<IconComponent Icon={FaWalking} />}
                />
                <FitnessLevelOption 
                  value="intermediate" 
                  title="בינוני" 
                  description="התאמנת באופן קבוע לפחות 3-6 חודשים" 
                  icon={<IconComponent Icon={FaRunning} />}
                />
                <FitnessLevelOption 
                  value="advanced" 
                  title="מתקדם" 
                  description="התאמנת באופן קבוע לפחות שנה" 
                  icon={<IconComponent Icon={FaDumbbell} />}
                />
              </div>
              {errors.fitnessLevel && <div className="invalid-feedback d-block">{errors.fitnessLevel}</div>}
            </div>

            <div className="form-group">
              <Form.Label>
                מטרות
                <div className="tooltip d-inline-block">
                  <span className="tooltip-icon me-2">?</span>
                  <span className="tooltip-text">
                    לדוגמה: חיזוק, הרזיה, בניית שרירים, שיפור סיבולת
                  </span>
                </div>
              </Form.Label>
              <div className="tags-container">
                {formData.goals.map((goal, index) => (
                  <span key={index} className="tag">
                    {goal}
                    <span className="tag-remove" onClick={() => handleRemoveGoal(goal)}><IconComponent Icon={ImCross} /></span>
                  </span>
                ))}
                <input
                  type="text"
                  className="tags-input"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="הוסף מטרה ולחץ Enter"
                />
              </div>
              {errors.goals && <div className="invalid-feedback d-block">{errors.goals}</div>}
            </div>

            <div className="form-group">
              <Form.Label>ימי אימון בשבוע</Form.Label>
              <div className="workout-days-container">
                <div className="workout-days-value">{formData.daysPerWeek}</div>
                <div className="workout-days-label">ימים</div>
              </div>
              <div className="number-input-container">
                <div className="number-btn minus" onClick={decrementDays}>
                  <IconComponent Icon={FaMinus} />
                </div>
                <input
                  type="range"
                  className="range-input"
                  min="1"
                  max="7"
                  name="daysPerWeek"
                  value={formData.daysPerWeek}
                  onChange={handleInputChange}
                />
                <div className="number-btn plus" onClick={incrementDays}>
                  <IconComponent Icon={FaPlus} />
                </div>
              </div>
              <div className="range-labels">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
              </div>
              {errors.daysPerWeek && <div className="invalid-feedback d-block">{errors.daysPerWeek}</div>}
            </div>

            <div className="form-group">
              <Form.Label>ציוד זמין</Form.Label>
              <Form.Select 
                name="equipment" 
                value={formData.equipment} 
                onChange={handleInputChange}
                className={`form-control ${errors.equipment ? 'is-invalid' : ''}`}
              >
                <option value="none">ללא ציוד (אימוני משקל גוף בלבד)</option>
                <option value="minimal">ציוד מינימלי (משקולות יד, גומיות כושר)</option>
                <option value="home-gym">חדר כושר ביתי (משקולות, מתח, מקבילים)</option>
                <option value="gym">חדר כושר מאובזר</option>
              </Form.Select>
              {errors.equipment && <div className="invalid-feedback">{errors.equipment}</div>}
            </div>

            <Button 
              type="submit" 
              className="ai-submit-btn" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'מייצר תוכנית...' : 'יצירת תוכנית אימונים'}
            </Button>
          </Form>
        </div>

        {isSubmitting && (
          <div className="ai-loading">
            <div className="ai-loading-spinner"></div>
            <div className="ai-loading-text">מייצר תוכנית אימונים מותאמת אישית...</div>
          </div>
        )}

        {planGenerated && workoutPlan && (
          <div id="workout-results" className="ai-result fade-in">
            <h3>תוכנית האימונים שלך</h3>
            <div className="workout-plan">
              <ReactMarkdown>{workoutPlan}</ReactMarkdown>
            </div>
            <div className="ai-result-actions">
              <button 
                className="ai-result-btn" 
                onClick={downloadWorkoutPlan}
              >
                הורדת התוכנית <IconComponent Icon={FaDownload} />
              </button>
              <button 
                className="ai-result-btn" 
                onClick={shareWorkoutPlan}
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

export default WorkoutPlanner; 