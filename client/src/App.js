import React, { useState } from "react";
import axios from "axios";

// ====== DIET PLANNER COMPONENT ======
function DietPlanner() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("meals");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    age: 25,
    gender: "male",
    height: 170,
    weight: 70,
    targetWeight: 65,
    goal: "lose",
    diet: "veg",
    activity: "1.2",
    restrictions: [],
    healthConditions: [],
  });

  const RENDER_BACKEND_URL = "https://brd-generation-agent.onrender.com";
  const goals = { lose: -400, gain: 400, maintain: 0 };
  const actLabels = {
    "1.2": "Sedentary",
    "1.375": "Lightly active",
    "1.55": "Moderately active",
    "1.725": "Very active",
  };
  const dietLabels = {
    veg: "Vegetarian",
    nonveg: "Non-vegetarian",
    eggetarian: "Eggetarian",
    vegan: "Vegan",
  };

  const toggleChip = (field, val) => {
    setForm((f) => {
      if (field === "restrictions" || field === "healthConditions") {
        const cur = f[field];
        return {
          ...f,
          [field]: cur.includes(val)
            ? cur.filter((x) => x !== val)
            : [...cur, val],
        };
      }
      return { ...f, [field]: val };
    });
  };

  const calcBMR = () => {
    const { age, gender, height, weight } = form;
    if (gender === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
    return 10 * weight + 6.25 * height - 5 * age - 161;
  };

  const generatePlan = async () => {
    setStep(2);
    setLoading(true);
    setError("");
    setPlan(null);

    const bmr = calcBMR();
    const tdee = Math.round(bmr * parseFloat(form.activity));
    const cal = tdee + goals[form.goal];
    const bmi = (form.weight / Math.pow(form.height / 100, 2)).toFixed(1);
    const protein = Math.round(form.weight * 1.6);
    const restricLabel =
      form.restrictions.length === 0 || form.restrictions.includes("none")
        ? "None"
        : form.restrictions.join(", ");

    const healthLabel =
      form.gender !== "female" || form.healthConditions.length === 0 || form.healthConditions.includes("none")
        ? "None"
        : form.healthConditions.join(", ").toUpperCase();

    const prompt = `You are a certified nutritionist. Create a personalized 1-day Indian diet plan as JSON.

User Profile:
- Age: ${form.age}, Gender: ${form.gender}, Height: ${form.height}cm, Weight: ${form.weight}kg
- Goal: ${form.goal} weight (target: ${form.targetWeight}kg)
- Diet type: ${dietLabels[form.diet]}
- Activity: ${actLabels[form.activity]}
- Restrictions: ${restricLabel}
- Health Conditions: ${healthLabel}
- Daily calorie target: ${cal} kcal
${healthLabel !== "None" ? `- IMPORTANT: Meal plan must be specifically tailored for ${healthLabel}. Include foods that help manage this condition and avoid foods that worsen it.` : ""}

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "summary": "One sentence about their health profile and goal",
  "tips": ["tip1", "tip2", "tip3"],
  "meals": [
    { "name": "Early morning", "time": "6:00 – 7:00 AM", "items": ["item with quantity"], "calories": 120, "protein": 5 },
    { "name": "Breakfast", "time": "8:00 – 9:00 AM", "items": ["item", "item"], "calories": 350, "protein": 15 },
    { "name": "Mid-morning snack", "time": "11:00 AM", "items": ["item"], "calories": 150, "protein": 6 },
    { "name": "Lunch", "time": "1:00 – 2:00 PM", "items": ["item", "item", "item"], "calories": 500, "protein": 25 },
    { "name": "Evening snack", "time": "4:30 – 5:30 PM", "items": ["item"], "calories": 150, "protein": 8 },
    { "name": "Dinner", "time": "7:00 – 8:00 PM", "items": ["item", "item", "item"], "calories": 450, "protein": 22 }
  ],
  "avoid": ["food1", "food2", "food3"],
  "hydration": "Hydration tip",
  "stats": { "calories": ${cal}, "protein": ${protein}, "bmi": "${bmi}" }
}`;

    try {
      const response = await axios.post(
        `${RENDER_BACKEND_URL}/api/generate-diet`,
        { prompt },
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.data.success) {
        setPlan(response.data.plan);
      } else {
        setError(response.data.error || "Plan generate karne mein error aaya.");
      }
    } catch (e) {
      setError("Plan generate karne mein error aaya. Dobara try karein.");
    } finally {
      setLoading(false);
    }
  };

  const Chip = ({ label, selected, onClick }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
          : "bg-[#0a0d16] border-gray-800 text-gray-400 hover:border-gray-600"
      }`}
    >
      {label}
    </button>
  );

  const SectionLabel = ({ children }) => (
    <p className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-3 mt-5">
      {children}
    </p>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Left: Input Panel */}
      <section className="bg-[#121624] border border-gray-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

        {/* Progress dots */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-purple-500" : "bg-gray-800"
              }`}
            />
          ))}
        </div>

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div>
            <SectionLabel>Basic info</SectionLabel>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Age</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: +e.target.value })}
                  className="w-full bg-[#0a0d16] border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full bg-[#0a0d16] border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: +e.target.value })}
                  className="w-full bg-[#0a0d16] border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: +e.target.value })}
                  className="w-full bg-[#0a0d16] border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            </div>

            <SectionLabel>Your goal</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { val: "lose", label: "Weight loss" },
                { val: "gain", label: "Weight gain" },
                { val: "maintain", label: "Maintain" },
              ].map((g) => (
                <Chip
                  key={g.val}
                  label={g.label}
                  selected={form.goal === g.val}
                  onClick={() => setForm({ ...form, goal: g.val })}
                />
              ))}
            </div>

            {form.gender === "female" && (
              <div>
                <SectionLabel>Health conditions (optional)</SectionLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { val: "pcod", label: "PCOD" },
                    { val: "pcos", label: "PCOS" },
                    { val: "thyroid", label: "Thyroid" },
                    { val: "diabetes", label: "Diabetes" },
                    { val: "anemia", label: "Anemia" },
                    { val: "none", label: "None" },
                  ].map((c) => (
                    <Chip
                      key={c.val}
                      label={c.label}
                      selected={form.healthConditions.includes(c.val)}
                      onClick={() => toggleChip("healthConditions", c.val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {form.goal !== "maintain" && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Target weight (kg)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="40"
                    max="130"
                    step="1"
                    value={form.targetWeight}
                    onChange={(e) =>
                      setForm({ ...form, targetWeight: +e.target.value })
                    }
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-sm font-medium text-purple-300 min-w-[52px]">
                    {form.targetWeight} kg
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-sm font-bold hover:opacity-90 transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Diet Preferences */}
        {step === 1 && (
          <div>
            <SectionLabel>Diet preference</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {["veg", "nonveg", "eggetarian", "vegan"].map((d) => (
                <Chip
                  key={d}
                  label={dietLabels[d]}
                  selected={form.diet === d}
                  onClick={() => setForm({ ...form, diet: d })}
                />
              ))}
            </div>

            <SectionLabel>Activity level</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(actLabels).map(([val, label]) => (
                <Chip
                  key={val}
                  label={label}
                  selected={form.activity === val}
                  onClick={() => setForm({ ...form, activity: val })}
                />
              ))}
            </div>

            <SectionLabel>Any restrictions?</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {["gluten", "dairy", "soy", "nuts", "none"].map((r) => (
                <Chip
                  key={r}
                  label={r === "none" ? "No restrictions" : `No ${r}`}
                  selected={form.restrictions.includes(r)}
                  onClick={() => toggleChip("restrictions", r)}
                />
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(0)}
                className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={generatePlan}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-sm font-bold hover:opacity-90 transition-all"
              >
                Generate my plan ✨
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Generated */}
        {step === 2 && (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <svg className="animate-spin h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-purple-300 text-sm animate-pulse tracking-widest">AI DIET PLAN GENERATING...</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-4">
                  ⚠️ {error}
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-all"
                >
                  ← Try again
                </button>
              </div>
            ) : plan ? (
              <div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{plan.summary}</p>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { val: plan.stats?.calories, label: "Daily kcal" },
                    { val: `${plan.stats?.protein}g`, label: "Protein" },
                    { val: plan.stats?.bmi, label: "BMI" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#0a0d16] rounded-xl p-3 text-center border border-gray-800">
                      <p className="text-lg font-bold text-purple-300">{s.val}</p>
                      <p className="text-xs text-gray-600 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setStep(0); setPlan(null); }}
                  className="w-full py-2.5 rounded-xl border border-gray-700 text-gray-400 text-xs hover:bg-gray-800 transition-all"
                >
                  ← Edit details
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Right: Diet Plan Output */}
      <section className="bg-[#121624] border border-gray-800/80 rounded-2xl p-6 shadow-2xl h-[calc(100vh-140px)] min-h-[500px] flex flex-col relative group">
        <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-purple-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-purple-400">
            Your Personalized Diet Plan
          </h2>
          {plan && (
            <div className="flex gap-2">
              {["meals", "tips", "avoid"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all font-medium capitalize ${
                    activeTab === t
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                      : "border-gray-700 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {!plan ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 space-y-3">
              <span className="text-4xl opacity-30">🥗</span>
              <p className="max-w-xs font-sans text-sm font-medium">
                Fill in your details and generate a personalized Indian diet plan.
              </p>
            </div>
          ) : activeTab === "meals" ? (
            plan.meals.map((meal, i) => (
              <div key={i} className="bg-[#0a0d16] border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{meal.name}</p>
                    <p className="text-xs text-gray-600">{meal.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-400">{meal.calories} kcal</p>
                    <p className="text-xs text-gray-600">{meal.protein}g protein</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {meal.items.join(" · ")}
                </p>
              </div>
            ))
          ) : activeTab === "tips" ? (
            <>
              {plan.tips.map((tip, i) => (
                <div key={i} className="bg-[#0a0d16] border border-gray-800 rounded-xl p-4 flex gap-3">
                  <span className="text-yellow-500 text-sm mt-0.5">💡</span>
                  <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
                </div>
              ))}
              <div className="bg-[#0a0d16] border border-gray-800 rounded-xl p-4 flex gap-3">
                <span className="text-blue-400 text-sm mt-0.5">💧</span>
                <p className="text-xs text-gray-400 leading-relaxed">{plan.hydration}</p>
              </div>
            </>
          ) : (
            plan.avoid.map((item, i) => (
              <div key={i} className="bg-[#0a0d16] border border-gray-800 rounded-xl p-4 flex gap-3">
                <span className="text-rose-400 text-sm mt-0.5">✕</span>
                <p className="text-xs text-gray-400 leading-relaxed">{item}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ====== MAIN APP COMPONENT ======
function App() {
  const [activeApp, setActiveApp] = useState("brd");
  const [textPrompt, setTextPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [brdOutput, setBrdOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const RENDER_BACKEND_URL = "https://brd-generation-agent.onrender.com";

  const handleFileChange = (e) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const handleGenerateBRD = async (e) => {
    e.preventDefault();
    if (!textPrompt.trim()) {
      setErrorMessage("Please enter your project requirements first!");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setBrdOutput("");

    const formData = new FormData();
    formData.append("textPrompt", textPrompt);
    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file) => formData.append("files", file));
    }

    try {
      const response = await axios.post(
        `${RENDER_BACKEND_URL}/api/generate-brd`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (response.data.success) {
        setBrdOutput(response.data.brd);
      } else {
        setErrorMessage(response.data.error || "Failed to generate BRD Document.");
      }
    } catch (error) {
      const serverErrorMsg = error.response?.data?.error || error.message;
      setErrorMessage(
        serverErrorMsg.includes("demand")
          ? "Server is busy. Please try again in 1 minute!"
          : `AI Server Error: ${serverErrorMsg}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] text-gray-100 font-sans antialiased selection:bg-purple-500/30 selection:text-purple-200">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f121d]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-xl font-bold text-white">✨</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              AI Productivity Suite
            </h1>
            <p className="text-xs text-gray-500 font-medium">HackDays Delhi - Track: Google Gemini AI</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-[#0a0d16] border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setActiveApp("brd")}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeApp === "brd"
                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            📄 BRD Generator
          </button>
          <button
            onClick={() => setActiveApp("diet")}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeApp === "diet"
                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            🥗 Diet Planner
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">AI Online</span>
        </div>
      </header>

      {/* BRD Tab */}
      {activeApp === "brd" && (
        <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: BRD Input */}
          <section className="bg-[#121624] border border-gray-800/80 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            <div>
              <label className="block text-sm font-semibold tracking-wide uppercase text-gray-400 mb-2">
                Project Requirements & Description
              </label>
              <textarea
                className="w-full h-48 bg-[#0a0d16] text-gray-200 placeholder-gray-600 border border-gray-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all resize-none text-sm leading-relaxed"
                placeholder="Describe your app concept, user flows, payment gateways, or key features here..."
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
              />
            </div>

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium rounded-xl p-4 leading-relaxed">
                ⚠️ {errorMessage}
              </div>
            )}
            <button
              onClick={handleGenerateBRD}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all shadow-xl transform active:scale-[0.99] flex items-center justify-center space-x-2 ${
                loading
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-purple-900/20 hover:shadow-purple-500/20"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="animate-pulse tracking-widest text-sm text-purple-300">ANALYZING SPECIFICATIONS...</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>Generate BRD Document</span>
                </>
              )}
            </button>
          </section>

          {/* Right: BRD Output */}
          <section className="bg-[#121624] border border-gray-800/80 rounded-2xl p-6 shadow-2xl h-[calc(100vh-140px)] min-h-[500px] flex flex-col justify-between relative group">
            <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-purple-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <h2 className="text-xs font-bold tracking-widest uppercase text-purple-400">
                Generated BRD Output (Markdown View)
              </h2>
              {brdOutput && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(brdOutput);
                    alert("BRD Markdown copied to clipboard!");
                  }}
                  className="text-xs bg-gray-800/60 border border-gray-700 hover:bg-gray-700 hover:text-white px-2.5 py-1 rounded-md transition-colors font-medium text-gray-300"
                >
                  📋 Copy Markdown
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-[#0a0d16] border border-gray-900 rounded-xl p-5 font-mono text-xs leading-relaxed text-gray-300 whitespace-pre-wrap select-text custom-scrollbar">
              {brdOutput ? (
                brdOutput
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 space-y-3">
                  <span className="text-4xl filter grayscale opacity-40">📄</span>
                  <p className="max-w-xs font-sans text-sm font-medium">
                    Your structured Business Requirement Document will render here once generation completes.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {/* Diet Planner Tab */}
      {activeApp === "diet" && <DietPlanner />}
    </div>
  );
}

export default App;