'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Save, FileText, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface RiskQuestion {
  id: string
  question: string
  options: {
    value: string
    label: string
    score: number
  }[]
  category: 'risk_tolerance' | 'risk_capacity' | 'investment_knowledge' | 'time_horizon'
}

const riskQuestions: RiskQuestion[] = [
  {
    id: 'investment_experience',
    question: 'What is your level of investment experience?',
    category: 'investment_knowledge',
    options: [
      { value: 'none', label: 'No experience - I am new to investing', score: 1 },
      { value: 'basic', label: 'Basic - I have some knowledge of investments', score: 2 },
      { value: 'moderate', label: 'Moderate - I understand most investment concepts', score: 3 },
      { value: 'advanced', label: 'Advanced - I have extensive investment experience', score: 4 }
    ]
  },
  {
    id: 'investment_timeframe',
    question: 'What is your primary investment timeframe?',
    category: 'time_horizon',
    options: [
      { value: 'short', label: 'Less than 2 years', score: 1 },
      { value: 'medium_short', label: '2-5 years', score: 2 },
      { value: 'medium_long', label: '5-10 years', score: 3 },
      { value: 'long', label: 'More than 10 years', score: 4 }
    ]
  },
  {
    id: 'risk_comfort',
    question: 'How comfortable are you with investment volatility?',
    category: 'risk_tolerance',
    options: [
      { value: 'very_uncomfortable', label: 'Very uncomfortable - I prefer stable returns', score: 1 },
      { value: 'somewhat_uncomfortable', label: 'Somewhat uncomfortable - I can handle minor fluctuations', score: 2 },
      { value: 'comfortable', label: 'Comfortable - I understand volatility is part of investing', score: 3 },
      { value: 'very_comfortable', label: 'Very comfortable - I can handle significant fluctuations', score: 4 }
    ]
  },
  {
    id: 'portfolio_loss',
    question: 'If your portfolio lost 20% in value over 6 months, what would you do?',
    category: 'risk_tolerance',
    options: [
      { value: 'sell_all', label: 'Sell all investments immediately', score: 1 },
      { value: 'sell_some', label: 'Sell some investments to reduce risk', score: 2 },
      { value: 'hold', label: 'Hold and wait for recovery', score: 3 },
      { value: 'buy_more', label: 'Buy more investments at lower prices', score: 4 }
    ]
  },
  {
    id: 'income_stability',
    question: 'How stable is your current income?',
    category: 'risk_capacity',
    options: [
      { value: 'unstable', label: 'Unstable - Income varies significantly', score: 1 },
      { value: 'somewhat_stable', label: 'Somewhat stable - Minor variations', score: 2 },
      { value: 'stable', label: 'Stable - Consistent income', score: 3 },
      { value: 'very_stable', label: 'Very stable - Guaranteed income', score: 4 }
    ]
  },
  {
    id: 'emergency_fund',
    question: 'Do you have an emergency fund covering 3-6 months of expenses?',
    category: 'risk_capacity',
    options: [
      { value: 'none', label: 'No emergency fund', score: 1 },
      { value: 'partial', label: 'Less than 3 months coverage', score: 2 },
      { value: 'adequate', label: '3-6 months coverage', score: 3 },
      { value: 'substantial', label: 'More than 6 months coverage', score: 4 }
    ]
  },
  {
    id: 'investment_goal',
    question: 'What is your primary investment goal?',
    category: 'risk_tolerance',
    options: [
      { value: 'capital_preservation', label: 'Capital preservation - Protect my money', score: 1 },
      { value: 'income', label: 'Income generation - Regular returns', score: 2 },
      { value: 'balanced', label: 'Balanced growth - Moderate growth with some income', score: 3 },
      { value: 'growth', label: 'Capital growth - Maximum long-term growth', score: 4 }
    ]
  },
  {
    id: 'age_retirement',
    question: 'How many years until you expect to retire?',
    category: 'time_horizon',
    options: [
      { value: 'retired', label: 'Already retired', score: 1 },
      { value: 'near', label: 'Less than 5 years', score: 2 },
      { value: 'medium', label: '5-15 years', score: 3 },
      { value: 'far', label: 'More than 15 years', score: 4 }
    ]
  }
]

export default function RiskProfilePage() {
  const params = useParams()
  const { toast } = useToast()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [riskProfile, setRiskProfile] = useState<{
    score: number
    category: string
    description: string
  } | null>(null)

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const nextQuestion = () => {
    if (currentQuestion < riskQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      calculateRiskProfile()
    }
  }

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const calculateRiskProfile = () => {
    let totalScore = 0
    let maxScore = 0

    riskQuestions.forEach(question => {
      const answer = answers[question.id]
      if (answer) {
        const option = question.options.find(opt => opt.value === answer)
        if (option) {
          totalScore += option.score
        }
      }
      maxScore += 4 // Maximum score per question
    })

    const percentage = (totalScore / maxScore) * 100
    
    let category = ''
    let description = ''

    if (percentage <= 25) {
      category = 'Conservative'
      description = 'You prefer capital preservation with minimal risk. Suitable investments include cash, term deposits, and conservative balanced funds.'
    } else if (percentage <= 50) {
      category = 'Balanced'
      description = 'You seek moderate growth with some income. A balanced mix of defensive and growth assets suits your profile.'
    } else if (percentage <= 75) {
      category = 'Growth'
      description = 'You are comfortable with volatility for higher long-term returns. Growth assets like shares and property are suitable.'
    } else {
      category = 'Aggressive'
      description = 'You can handle significant volatility for maximum growth potential. High-growth investments align with your profile.'
    }

    setRiskProfile({
      score: Math.round(percentage),
      category,
      description
    })
    setIsCompleted(true)
  }

  const saveRiskProfile = async () => {
    try {
      // In a real implementation, this would save to Supabase
      console.log('Saving risk profile:', {
        clientId: params.id,
        answers,
        riskProfile,
        completionDate: new Date().toISOString()
      })

      toast({
        title: 'Risk Profile Saved',
        description: 'The risk assessment has been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save risk profile. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const progress = ((currentQuestion + 1) / riskQuestions.length) * 100
  const currentQ = riskQuestions[currentQuestion]
  const hasAnswered = answers[currentQ?.id]

  if (isCompleted && riskProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-black dark:text-white">Risk Profile Assessment</h1>
            <p className="text-muted-foreground mt-1">Completed assessment results</p>
          </div>
        </div>

        <Card className="border-cream-dark">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-coral">Assessment Complete</CardTitle>
            <CardDescription>Here are the results of the risk profile assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-coral mb-2">{riskProfile.score}%</div>
              <Badge 
                variant="outline" 
                className="text-lg px-4 py-2 border-coral text-coral"
              >
                {riskProfile.category}
              </Badge>
            </div>

            <div className="bg-cream-light dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-black dark:text-white">
                <FileText className="h-5 w-5 text-coral" />
                Risk Profile Summary
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{riskProfile.description}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Important Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This assessment is indicative only. Final investment recommendations should consider your complete financial situation and be reviewed with your financial adviser.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={saveRiskProfile} className="bg-coral hover:bg-coral-dark">
                <Save className="h-4 w-4 mr-2" />
                Save Assessment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCompleted(false)
                  setCurrentQuestion(0)
                  setAnswers({})
                  setRiskProfile(null)
                }}
              >
                Retake Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/clients/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-black dark:text-white">Risk Profile Assessment</h1>
          <p className="text-muted-foreground mt-1">
            Question {currentQuestion + 1} of {riskQuestions.length}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <Card className="border-cream-dark">
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQ.question}
          </CardTitle>
          <CardDescription>
            Select the option that best describes your situation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQ.id] || ''}
            onValueChange={(value) => handleAnswer(currentQ.id, value)}
            className="space-y-4"
          >
            {currentQ.options.map((option) => (
              <div key={option.value} className="flex items-start space-x-3 p-4 rounded-lg border border-cream-dark hover:bg-cream-light transition-colors">
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <Label 
                  htmlFor={option.value} 
                  className="flex-1 text-sm font-medium leading-relaxed cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={previousQuestion}
          disabled={currentQuestion === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={nextQuestion}
          disabled={!hasAnswered}
          className="bg-coral hover:bg-coral-dark"
        >
          {currentQuestion === riskQuestions.length - 1 ? 'Complete Assessment' : 'Next Question'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}