import React, { useState, useEffect } from 'react';
import { Box, Button, Container, FormControl, FormLabel, Select, TextField, Typography, Paper, CircularProgress, Alert, SelectChangeEvent } from '@mui/material';
import { generateWorkoutPlan } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/aiService';
import { WorkoutPlanRequest } from '../types';

// אייקונים ייבואו מהספרייה react-icons
import * as FaIcons from 'react-icons/fa';
import * as GiIcons from 'react-icons/gi';

const WorkoutPlanner: React.FC = () => {
  const { authState } = useAuth();
  const { isAuthenticated } = authState;
  const navigate = useNavigate();
  
  // עדכון למבנה הנתונים התואם את הסכמה החדשה
  const [formData, setFormData] = useState<WorkoutPlanRequest>({
    fitnessLevel: 'beginner',
    goals: ['חיזוק שרירים'], // מערך של מטרות עם ערך התחלתי
    daysPerWeek: 3,
    equipment: 'minimal',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [planSource, setPlanSource] = useState<string>('');
  
  // לא להציג תוכנית אימון בעת אתחול הקומפוננטה
  useEffect(() => {
    setWorkoutPlan(null);
  }, []);

  // לוגים לצורך דיבוג
  useEffect(() => {
    console.log('[WorkoutPlanner] Authentication state on mount:', { isAuthenticated });
  }, [isAuthenticated]);

  // ניקוי הודעת שגיאה כשמשתנה אחד מהשדות בטופס
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [formData.fitnessLevel, formData.goals, formData.daysPerWeek, formData.equipment]);

  // בדוק אם המשתמש מחובר
  useEffect(() => {
    if (!authState.isAuthenticated) {
      navigate('/login');
    }
  }, [authState.isAuthenticated, navigate]);

  const handleFitnessLevelChange = (level: 'beginner' | 'intermediate' | 'advanced') => {
    setFormData(prev => ({ ...prev, fitnessLevel: level }));
  };

  const handleGoalsChange = (goals: string[]) => {
    setFormData(prev => ({ ...prev, goals }));
  };

  const handleDaysChange = (days: number) => {
    if (days >= 1 && days <= 7) {
      setFormData(prev => ({ ...prev, daysPerWeek: days }));
    }
  };

  const handleEquipmentChange = (equipment: 'none' | 'minimal' | 'home-gym' | 'gym') => {
    setFormData(prev => ({ ...prev, equipment }));
  };

  const handleAddGoal = (goal: string) => {
    if (goal && !formData.goals.includes(goal)) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, goal]
      }));
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g !== goal)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.goals.length === 0) {
      setError('נא להוסיף לפחות מטרה אחת לאימון');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // לוג לפני שליחת הבקשה
      console.log('[WorkoutPlanner] Submitting workout plan form data:', formData);
      
      // שליחת הבקשה לשרת
      const plan = await aiService.generateWorkoutPlan(formData);
      setWorkoutPlan(plan);
      
      // לוג של התשובה שהתקבלה
      console.log('[WorkoutPlanner] Workout plan received:', plan ? plan.substring(0, 100) + '...' : 'No plan received');
      
    } catch (err: any) {
      console.error('[WorkoutPlanner] Error generating workout plan:', err);
      setError(err.message || 'אירעה שגיאה בעת יצירת תוכנית האימונים');
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelDisplay = (level: string): string => {
    switch (level) {
      case 'beginner': return 'מתחיל';
      case 'intermediate': return 'בינוני';
      case 'advanced': return 'מתקדם';
      default: return level;
    }
  };

  const getEquipmentDisplay = (equipment: string): string => {
    switch (equipment) {
      case 'none': return 'ללא ציוד (אימוני משקל גוף בלבד)';
      case 'minimal': return 'ציוד מינימלי (משקולות יד, גומיות)';
      case 'home-gym': return 'חדר כושר ביתי';
      case 'gym': return 'חדר כושר מאובזר';
      default: return equipment;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ mb: 3 }}>
        תכנון תוכנית אימון אישית
      </Typography>
      
      {!isAuthenticated && (
        <Alert severity="info" sx={{ mb: 3 }}>
          יש להתחבר כדי לייצר תוכנית אימון אישית
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>רמת הכושר שלך</FormLabel>
            <div className="fitness-level-options">
              <button 
                className={`option ${formData.fitnessLevel === 'beginner' ? 'active' : ''}`}
                onClick={() => handleFitnessLevelChange('beginner')}
              >
                מתחיל
              </button>
              <button 
                className={`option ${formData.fitnessLevel === 'intermediate' ? 'active' : ''}`}
                onClick={() => handleFitnessLevelChange('intermediate')}
              >
                בינוני
              </button>
              <button 
                className={`option ${formData.fitnessLevel === 'advanced' ? 'active' : ''}`}
                onClick={() => handleFitnessLevelChange('advanced')}
              >
                מתקדם
              </button>
            </div>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>מטרות:</FormLabel>
            <div className="goals-container">
              {formData.goals.map((goal, index) => (
                <div key={index} className="goal-tag">
                  {goal}
                  <button onClick={() => handleRemoveGoal(goal)}>×</button>
                </div>
              ))}
            </div>
            <input 
              type="text" 
              placeholder="הוסף מטרה (לדוגמה: חיזוק שרירים)" 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  handleAddGoal(input.value);
                  input.value = '';
                }
              }}
            />
            <small>לחץ Enter להוספת מטרה</small>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>ימי אימון בשבוע</FormLabel>
            <div className="days-selector">
              <button onClick={() => handleDaysChange(formData.daysPerWeek - 1)} disabled={formData.daysPerWeek <= 1}>-</button>
              <input 
                type="range" 
                min="1" 
                max="7" 
                value={formData.daysPerWeek} 
                onChange={(e) => handleDaysChange(parseInt(e.target.value))} 
              />
              <button onClick={() => handleDaysChange(formData.daysPerWeek + 1)} disabled={formData.daysPerWeek >= 7}>+</button>
            </div>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>ציוד זמין:</FormLabel>
            <select 
              value={formData.equipment} 
              onChange={(e) => handleEquipmentChange(e.target.value as 'none' | 'minimal' | 'home-gym' | 'gym')}
            >
              <option value="none">ללא ציוד (אימוני משקל גוף בלבד)</option>
              <option value="minimal">ציוד מינימלי (משקולות יד, גומיות)</option>
              <option value="home-gym">חדר כושר ביתי</option>
              <option value="gym">חדר כושר מאובזר</option>
            </select>
          </FormControl>
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading || !isAuthenticated}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'צור תוכנית אימון'}
          </Button>
        </form>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {workoutPlan && (
        <Paper elevation={3} sx={{ p: 3, mt: 4, direction: 'rtl' }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" component="h2">
              תוכנית האימון שלך
            </Typography>
            
            <Box>
              {planSource === 'fallback' && (
                <Alert severity="info" sx={{ mb: 0 }}>
                  זוהי תוכנית מוכנה מראש. שירות ה-AI אינו זמין כרגע.
                </Alert>
              )}
              
              {planSource === 'ai' && (
                <Alert severity="success" sx={{ mb: 0 }}>
                  תוכנית אימון מותאמת אישית שנוצרה על ידי בינה מלאכותית
                </Alert>
              )}
            </Box>
          </Box>
          
          <Box sx={{ mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.03)', p: 2, borderRadius: 1 }}>
            <Typography variant="body1" gutterBottom>
              <strong>רמת כושר:</strong> {getLevelDisplay(formData.fitnessLevel)}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>מטרות:</strong> {formData.goals.join(', ')}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>ימי אימון בשבוע:</strong> {formData.daysPerWeek}
            </Typography>
            <Typography variant="body1">
              <strong>ציוד זמין:</strong> {getEquipmentDisplay(formData.equipment)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            overflowX: 'auto', 
            fontSize: '1rem',
            '& h1, & h2, & h3': { 
              fontWeight: 'bold',
              mt: 2,
              mb: 1,
              color: 'primary.main' 
            },
            '& h1': { fontSize: '1.8rem' },
            '& h2': { fontSize: '1.5rem' },
            '& h3': { fontSize: '1.2rem' },
            '& ul, & ol': { pl: 4, mb: 2 },
            '& li': { mb: 0.5 },
            '& p': { mb: 1 }
          }}>
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter
                      // @ts-ignore - טיפול בשגיאת התאמת הטיפוסים
                      style={materialDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {workoutPlan}
            </ReactMarkdown>
          </Box>
          
          <Box sx={{ mt: 4, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => {
                window.print();
              }}
            >
              הדפס תוכנית
            </Button>
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setWorkoutPlan(null);
                setPlanSource('');
              }}
            >
              יצירת תוכנית חדשה
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default WorkoutPlanner; 