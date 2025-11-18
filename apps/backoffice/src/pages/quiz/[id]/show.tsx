import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Pencil, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function ShowQuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: quiz, isLoading } = trpc.quiz.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const { data: quizQuestions } = trpc.quizQuestion.getByQuiz.useQuery(
    { quizId: Number(id) },
    { enabled: !!id }
  );

  const { data: levels } = trpc.level.getAll.useQuery();
  const { data: questions } = trpc.question.getAll.useQuery();
  const { data: answers } = trpc.answer.getAll.useQuery();

  if (isLoading) {
    return <div className="text-center py-8">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="text-center py-8">Quiz not found</div>;
  }

  const level = levels?.find((l) => l.id === quiz.levelId);

  // Get questions with their answers
  const quizQuestionsWithData = quizQuestions
    ?.sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((qq) => {
      const question = questions?.find((q) => q.id === qq.questionId);
      const questionAnswers = answers?.filter((a) => a.questionId === qq.questionId);
      return {
        ...qq,
        question,
        answers: questionAnswers,
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/quiz')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{quiz.title || 'Unnamed Quiz'}</h1>
            <p className="text-gray-600 mt-1">Quiz #{quiz.id}</p>
          </div>
        </div>
        <Link to={`/quiz/${id}/edit`}>
          <Button className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit Quiz
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">ID</label>
              <p className="mt-1 text-gray-900 font-mono">#{quiz.id}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <div className="mt-1">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    quiz.type === 'DAILY'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {quiz.type || '-'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="mt-1 text-gray-900">{quiz.title || '-'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Date</label>
              <p className="mt-1 text-gray-900">
                {quiz.date ? new Date(quiz.date).toLocaleDateString() : '-'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Level</label>
              <p className="mt-1 text-gray-900">
                {level ? level.title || `Level ${level.number}` : '-'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{quiz.description || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions ({quizQuestionsWithData?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {quizQuestionsWithData && quizQuestionsWithData.length > 0 ? (
              <div className="space-y-4">
                {quizQuestionsWithData.map((qq, index) => (
                  <div key={qq.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">#{qq.questionId}</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {qq.question?.text || 'Unnamed question'}
                        </p>
                        {qq.answers && qq.answers.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {qq.answers.map((answer) => (
                              <div
                                key={answer.id}
                                className={`flex items-center gap-2 text-sm ${
                                  answer.isCorrect ? 'text-green-600' : 'text-gray-600'
                                }`}
                              >
                                {answer.isCorrect ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                {answer.text}
                              </div>
                            ))}
                          </div>
                        )}
                        <Link
                          to={`/questions/${qq.questionId}`}
                          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                        >
                          View question details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No questions associated</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
