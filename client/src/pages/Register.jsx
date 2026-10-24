import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import AuthCard, { Field, SubmitButton } from '../components/AuthCard.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Un seul gestionnaire pour tous les champs, grâce à l'attribut "name" de l'input
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Vérifications côté navigateur pour un retour immédiat (le serveur revérifie de toute façon)
    if (form.password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères')
    if (form.password !== form.confirm) return setError('Les deux mots de passe ne correspondent pas')

    setLoading(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Créer un compte"
      error={error}
      footer={
        <>
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Field label="Nom (facultatif)" name="name" autoComplete="name" value={form.name} onChange={handleChange} />
        <Field label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} />
        <Field label="Mot de passe (8 caractères minimum)" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={handleChange} />
        <Field label="Confirmer le mot de passe" name="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={handleChange} />
        <SubmitButton loading={loading}>Créer mon compte</SubmitButton>
      </form>
    </AuthCard>
  )
}
