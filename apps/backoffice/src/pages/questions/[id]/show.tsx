import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Pencil, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function ShowQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: question, isLoading } = trpc.question.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const { data: answers } = trpc.answer.getAll.useQuery();

  // Get answers for this question
  const questionAnswers = answers?.filter((a) => a.questionId === Number(id));

  // Get quiz associations
  const { data: quizQuestions } = trpc.quizQuestion.getAll.useQuery();
  const { data: quizList } = trpc.quiz.getAll.useQuery();

  // Find which quiz this question belongs to
  const associatedQuiz = quizQuestions
    ?.filter((qq) => qq.questionId === Number(id))
    .map((qq) => {
      const quiz = quizList?.find((q) => q.id === qq.quizId);
      return { ...qq, quiz };
    });

  if (isLoading) {
    return <div className="text-center py-8">Loading question...</div>;
  }

  if (!question) {
    return <div className="text-center py-8">Question not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/questions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Details</h1>
            <p className="text-gray-600 mt-1">Question #{id}</p>
          </div>
        </div>
        <Link to={`/questions/${id}/edit`}>
          <Button className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit Question
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">ID</label>
              <p className="mt-1 text-gray-900 font-mono">#{question.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Text</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{question.text || 'No text'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Associated Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            {associatedQuiz && associatedQuiz.length > 0 ? (
              <div className="space-y-2">
                {associatedQuiz.map((aq) => (
                  <Link
                    key={aq.id}
                    to={`/quiz/${aq.quizId}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">
                      {aq.quiz?.title || 'Unnamed Quiz'}
                    </p>
                    <p className="text-sm text-gray-500">Position: {aq.position || '-'}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Not associated with any quiz</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Answers ({questionAnswers?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {questionAnswers && questionAnswers.length > 0 ? (
            <div className="space-y-3">
              {questionAnswers.map((answer) => (
                <div
                  key={answer.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    answer.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {answer.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={answer.isCorrect ? 'text-green-900' : 'text-gray-900'}>
                      {answer.text || 'No text'}
                    </p>
                    {answer.isCorrect && (
                      <span className="inline-block mt-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        Correct Answer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No answers defined</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
