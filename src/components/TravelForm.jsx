import { useState } from 'react'
import { validateTravelInput } from '../lib/validation'

export default function TravelForm({ onGenerate, isLoading }) {
  const [form, setForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    companion: '',
    concept: '',
  })

  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validation = validateTravelInput(form)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitAttempted(true)

    if (!validation.valid) {
      return
    }

    onGenerate({
      destination: form.destination.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      companion: form.companion,
      concept: form.concept,
    })
  }

  return (
    <form className="travel-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="destination">목적지</label>
        <input
          id="destination"
          name="destination"
          value={form.destination}
          onChange={handleChange}
          placeholder="예: 제주도"
        />
      </div>

      <div className="field">
        <label htmlFor="startDate">출발일</label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          value={form.startDate}
          onChange={handleChange}
        />
      </div>

      <div className="field">
        <label htmlFor="endDate">도착일</label>
        <input
          id="endDate"
          name="endDate"
          type="date"
          value={form.endDate}
          onChange={handleChange}
        />
      </div>

      <div className="field">
        <label htmlFor="companion">동반자</label>
        <select
          id="companion"
          name="companion"
          value={form.companion}
          onChange={handleChange}
        >
          <option value="">선택해주세요</option>
          <option value="혼자">혼자</option>
          <option value="친구">친구</option>
          <option value="연인">연인</option>
          <option value="가족">가족</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="concept">여행 컨셉</label>
        <select
          id="concept"
          name="concept"
          value={form.concept}
          onChange={handleChange}
        >
          <option value="">선택해주세요</option>
          <option value="힐링">힐링</option>
          <option value="미식">미식</option>
          <option value="감성">감성</option>
          <option value="액티비티">액티비티</option>
        </select>
      </div>

      {submitAttempted && !validation.valid && (
        <div className="form-errors" role="alert">
          {validation.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? '코스 생성 중...' : '코스 생성'}
      </button>
    </form>
  )
}