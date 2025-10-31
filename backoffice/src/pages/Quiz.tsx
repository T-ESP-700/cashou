import { Plus, Edit, Trash2, Calendar, Target } from 'lucide-react';

export default function Quiz() {
  // Mock data
  const quizzes = [
    {
      id: 1,
      title: 'Daily Market Check',
      type: 'daily',
      level: 'Level 1',
      date: '2024-10-31',
      questions: 5,
      completions: 234,
      accuracy: 78,
    },
    {
      id: 2,
      title: 'Trading Basics',
      type: 'MCQ',
      level: 'Level 2',
      date: '2024-10-30',
      questions: 10,
      completions: 189,
      accuracy: 82,
    },
    {
      id: 3,
      title: 'Market Analysis Quiz',
      type: 'MCQ',
      level: 'Level 3',
      date: '2024-10-29',
      questions: 15,
      completions: 156,
      accuracy: 75,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz</h1>
          <p className="text-gray-600 mt-2">Manage quiz questions and assessments</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Create Quiz
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Quiz</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <Target className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">5,678</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <Calendar className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Accuracy</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">78%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <Target className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Level</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Questions</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Completions</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Accuracy</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{quiz.title}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        quiz.type === 'daily'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {quiz.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">{quiz.level}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{quiz.date}</td>
                  <td className="py-3 px-4">{quiz.questions}</td>
                  <td className="py-3 px-4">{quiz.completions}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-green-600">{quiz.accuracy}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

