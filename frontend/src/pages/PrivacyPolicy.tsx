interface Props { onBack: () => void }

export default function PrivacyPolicy({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">Privacy Policy</h1>
            <p className="text-gray-500 text-sm">Last updated: May 2026</p>
          </div>
          <button onClick={onBack}
            className="bg-gradient-to-r from-[#ed4690] to-[#f58133] px-6 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shrink-0">
            Back
          </button>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p className="text-gray-400 leading-relaxed">
            When you create an account, we collect your name, email address, and account role (student or HR).
            When you use the platform, we process the job descriptions and CVs you upload solely to provide
            the AI screening, analysis, and bias detection features.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. How We Use Your Data</h2>
          <p className="text-gray-400 leading-relaxed">
            Your data is used exclusively to operate the RecruitAI service: parsing job descriptions,
            screening CVs, generating bias reports, drafting emails, and providing AI chat assistance.
            We do not train LLMs on your data, sell your information, or share it with third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. AI Processing</h2>
          <p className="text-gray-400 leading-relaxed">
            AI processing is powered by Cerebras cloud inference running gpt-oss-120b. Your CVs and job
            descriptions are sent securely to Cerebras's API for analysis. Cerebras's data usage policy states
            that prompts and completions are not used for training. All results are stored locally in
            your own database.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Data Storage</h2>
          <p className="text-gray-400 leading-relaxed">
            Data is stored locally in a SQLite database on the server where RecruitAI is deployed.
            Passwords are hashed using bcrypt. You may delete your account and all associated data
            at any time from the Settings page.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Your Rights</h2>
          <p className="text-gray-400 leading-relaxed">
            You may access, update, or delete your personal data at any time. Account deletion
            permanently removes all jobs, candidates, results, chat history, and analyses.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Contact</h2>
          <p className="text-gray-400 leading-relaxed">
            If you have questions about this policy, please contact the project maintainer.
          </p>
        </section>
      </div>
    </div>
  )
}
