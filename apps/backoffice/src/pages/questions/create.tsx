import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useBackofficeStore } from '@/store/useBackofficeStore';

interface QuestionFormData {
  text: string;
}

interface Answer {
  text: string;
  isCorrect: boolean;
}

export default function CreateQuestionPage() {
  const navigate = useNavigate();
  const setModule = useBackofficeStore((state) => state.setModule);
  const utils = trpc.useUtils();
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<QuestionFormData>();

  const createQuestionMutation = trpc.question.create.useMutation();
  const createAnswerMutation = trpc.answer.create.useMutation();

  useEffect(() => {
    setModule('questions');
  }, [setModule]);

  // Fonction pour ajouter " ?" si ce n'est pas déjà présent
  const ensureQuestionMark = (text: string): string => {
    const trimmed = text.trim();
    if (trimmed && !trimmed.endsWith('?')) {
      return trimmed + ' ?';
    }
    return trimmed;
  };

  const onSubmit = async (data: QuestionFormData) => {
    try {
      // Ajouter " ?" si nécessaire
      const finalQuestionText = ensureQuestionMark(data.text);
      
      // Create question first
      const result = await createQuestionMutation.mutateAsync({ text: finalQuestionText });

      // Create all answers
      const validAnswers = answers.filter((a) => a.text.trim() !== '');
      if (validAnswers.length > 0) {
        await Promise.all(
          validAnswers.map((answer) =>
            createAnswerMutation.mutateAsync({
              questionId: result.question.id,
              text: answer.text,
              isCorrect: answer.isCorrect,
            })
          )
        );
      }

      toast.success('Question créée avec ses réponses');
      utils.question.getAll.invalidate();
      utils.answer.getAll.invalidate();
      reset();
      setQuestionText('');
      setAnswers([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
      navigate('/questions');
    } catch (error: unknown) {
      toast.error(`Échec de la création de la question: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const updateAnswer = (index: number, field: keyof Answer, value: string | boolean) => {
    const newAnswers = [...answers];
    if (field === 'isCorrect' && value === true) {
      // Only one answer can be correct - uncheck others
      newAnswers.forEach((a, i) => {
        newAnswers[i] = { ...a, isCorrect: i === index };
      });
    } else {
      newAnswers[index] = { ...newAnswers[index], [field]: value };
    }
    setAnswers(newAnswers);
  };

  // Vérifier les réponses dupliquées (insensible à la casse et aux espaces)
  const getDuplicateIndices = (): Set<number> => {
    const duplicateIndices = new Set<number>();
    const answerTexts = answers.map((a, i) => ({
      text: a.text.trim().toLowerCase(),
      index: i,
    }));

    for (let i = 0; i < answerTexts.length; i++) {
      if (!answerTexts[i].text) continue; // Ignorer les champs vides
      for (let j = i + 1; j < answerTexts.length; j++) {
        if (!answerTexts[j].text) continue; // Ignorer les champs vides
        if (answerTexts[i].text === answerTexts[j].text) {
          duplicateIndices.add(i);
          duplicateIndices.add(j);
        }
      }
    }
    return duplicateIndices;
  };

  const duplicateIndices = getDuplicateIndices();
  const hasDuplicateAnswers = duplicateIndices.size > 0;

  // Vérifications dans l'ordre : question → 4 réponses → correct → dupliqués
  const isQuestionFilled = questionText.trim() !== '';
  const allAnswersFilled = answers.every((answer) => answer.text.trim() !== '');
  const hasCorrectAnswer = answers.some((answer) => answer.isCorrect);
  
  const isSubmitDisabled = 
    createQuestionMutation.isPending || 
    createAnswerMutation.isPending || 
    !isQuestionFilled || 
    !allAnswersFilled || 
    !hasCorrectAnswer ||
    hasDuplicateAnswers;
  
  // Déterminer le message d'erreur à afficher dans l'ordre : question → réponses → correct → dupliqués
  const getErrorMessage = () => {
    if (!isQuestionFilled) {
      return 'Veuillez remplir le champ question';
    }
    if (!allAnswersFilled) {
      return 'Veuillez remplir tous les 4 champs de réponse';
    }
    if (!hasCorrectAnswer) {
      return 'Veuillez cocher au moins une réponse comme correcte';
    }
    if (hasDuplicateAnswers) {
      return 'Les réponses ne doivent pas être identiques';
    }
    return null;
  };
  
  const errorMessage = getErrorMessage();

  // Gérer le changement du texte de la question
  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuestionText(value);
    setValue('text', value);
  };

  // Ajouter " ?" automatiquement lors du blur
  const handleQuestionBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const finalValue = ensureQuestionMark(value);
    if (finalValue !== value) {
      setQuestionText(finalValue);
      setValue('text', finalValue);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Créer une Question</h1>
        <Button variant="outline" onClick={() => navigate('/questions')}>Annuler</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations de la Question</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Texte de la Question <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('text', { required: 'Le texte de la question est requis' })}
                value={questionText}
                onChange={handleQuestionChange}
                onBlur={handleQuestionBlur}
                placeholder="Entrez votre question"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[100px] resize-y placeholder:text-gray-400"
              />
              {errors.text && (
                <p className="text-xs text-red-500">{errors.text.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Réponses</label>

              {answers.map((answer, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={answer.text}
                    onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                    placeholder={`Réponse ${index + 1}`}
                    className={`flex-1 rounded-md border overflow-hidden px-3 py-2 text-sm placeholder:text-gray-400 ${
                      duplicateIndices.has(index)
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                  <label className="flex items-center gap-2 whitespace-nowrap">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={answer.isCorrect}
                      onChange={() => updateAnswer(index, 'isCorrect', true)}
                      className="border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">Correcte</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <div className="relative inline-block group">
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="relative"
                >
                  {createQuestionMutation.isPending || createAnswerMutation.isPending
                    ? 'Création...'
                    : 'Créer la Question'}
                </Button>
                {errorMessage && (
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md max-w-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                    {errorMessage}
                    <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => navigate('/questions')}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
