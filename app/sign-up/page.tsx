// 'use client'

// import { useSignUp } from '@clerk/nextjs'
// import { useRouter } from 'next/navigation'
// import Link from 'next/link'
// import * as React from 'react'

// export default function SignUpPage() {
//   const { signUp, errors, fetchStatus } = useSignUp()
//   const router = useRouter()
//   const [verifying, setVerifying] = React.useState(false)

//   const handleSubmit = async (formData: FormData) => {
//     const emailAddress = formData.get('email') as string
//     const password = formData.get('password') as string

//     await signUp.password({ emailAddress, password })

//     if (!errors?.global) {
//       await signUp.verifications.sendEmailCode()
//       setVerifying(true)
//     }
//   }

//   const handleVerify = async (formData: FormData) => {
//     const code = formData.get('code') as string

//     await signUp.verifications.verifyEmailCode({ code })

//     if (signUp.status === 'complete') {
//       await signUp.finalize({
//         navigate: ({ session, decorateUrl }) => {
//           if (session?.currentTask) return
//           const url = decorateUrl('/')
//           if (url.startsWith('http')) {
//             window.location.href = url
//           } else {
//             router.push(url)
//           }
//         },
//       })
//     }
//   }

//   if (verifying) {
//     return (
//       <main style={styles.container}>
//         <div style={styles.card}>
//           <h1 style={styles.title}>Check your email</h1>
//           <p style={styles.subtitle}>We sent a verification code to your email address.</p>

//           <form action={handleVerify} style={styles.form}>
//             <div style={styles.field}>
//               <label htmlFor="code" style={styles.label}>Verification code</label>
//               <input
//                 id="code"
//                 name="code"
//                 type="text"
//                 inputMode="numeric"
//                 autoComplete="one-time-code"
//                 required
//                 style={styles.input}
//                 placeholder="123456"
//               />
//               {errors?.fields?.code && (
//                 <p style={styles.error}>{errors.fields.code.message}</p>
//               )}
//             </div>

//             {errors?.global && errors.global.length > 0 && (
//               <p style={styles.error}>{errors.global[0].message}</p>
//             )}

//             <button
//               type="submit"
//               disabled={fetchStatus === 'fetching'}
//               style={{ ...styles.button, opacity: fetchStatus === 'fetching' ? 0.6 : 1 }}
//             >
//               {fetchStatus === 'fetching' ? 'Verifying…' : 'Verify email'}
//             </button>
//           </form>

//           <button
//             onClick={() => signUp.verifications.sendEmailCode()}
//             style={styles.ghostButton}
//           >
//             Resend code
//           </button>
//         </div>
//       </main>
//     )
//   }

//   return (
//     <main style={styles.container}>
//       <div style={styles.card}>
//         <h1 style={styles.title}>Create account</h1>
//         <p style={styles.subtitle}>Get started for free</p>

//         <form action={handleSubmit} style={styles.form}>
//           <div style={styles.field}>
//             <label htmlFor="email" style={styles.label}>Email address</label>
//             <input
//               id="email"
//               name="email"
//               type="email"
//               autoComplete="email"
//               required
//               style={styles.input}
//               placeholder="you@example.com"
//             />
//             {errors?.fields?.emailAddress && (
//               <p style={styles.error}>{errors.fields.emailAddress.message}</p>
//             )}
//           </div>

//           <div style={styles.field}>
//             <label htmlFor="password" style={styles.label}>Password</label>
//             <input
//               id="password"
//               name="password"
//               type="password"
//               autoComplete="new-password"
//               required
//               style={styles.input}
//               placeholder="••••••••"
//             />
//             {errors?.fields?.password && (
//               <p style={styles.error}>{errors.fields.password.message}</p>
//             )}
//           </div>

//           {errors?.global && errors.global.length > 0 && (
//             <p style={styles.error}>{errors.global[0].message}</p>
//           )}

//           <button
//             type="submit"
//             disabled={fetchStatus === 'fetching'}
//             style={{ ...styles.button, opacity: fetchStatus === 'fetching' ? 0.6 : 1 }}
//           >
//             {fetchStatus === 'fetching' ? 'Creating account…' : 'Continue'}
//           </button>
//         </form>

//         {/* Required: bot protection CAPTCHA placeholder */}
//         <div id="clerk-captcha" />

//         <p style={styles.footer}>
//           Already have an account?{' '}
//           <Link href="/sign-in" style={styles.link}>Sign in</Link>
//         </p>
//       </div>
//     </main>
//   )
// }

// const styles: Record<string, React.CSSProperties> = {
//   container: {
//     minHeight: '100vh',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
//     padding: '1rem',
//   },
//   card: {
//     background: 'rgba(255,255,255,0.05)',
//     backdropFilter: 'blur(16px)',
//     border: '1px solid rgba(255,255,255,0.1)',
//     borderRadius: '1rem',
//     padding: '2.5rem',
//     width: '100%',
//     maxWidth: '400px',
//     boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
//   },
//   title: {
//     fontSize: '1.75rem',
//     fontWeight: 700,
//     color: '#fff',
//     margin: '0 0 0.25rem',
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.5)',
//     margin: '0 0 2rem',
//     fontSize: '0.95rem',
//   },
//   form: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '1.25rem',
//   },
//   field: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '0.4rem',
//   },
//   label: {
//     fontSize: '0.875rem',
//     fontWeight: 500,
//     color: 'rgba(255,255,255,0.75)',
//   },
//   input: {
//     background: 'rgba(255,255,255,0.08)',
//     border: '1px solid rgba(255,255,255,0.15)',
//     borderRadius: '0.5rem',
//     padding: '0.65rem 0.9rem',
//     color: '#fff',
//     fontSize: '0.95rem',
//     outline: 'none',
//     width: '100%',
//     boxSizing: 'border-box',
//   },
//   error: {
//     color: '#f87171',
//     fontSize: '0.8rem',
//     margin: 0,
//   },
//   button: {
//     background: 'linear-gradient(135deg, #6c47ff, #a78bfa)',
//     color: '#fff',
//     border: 'none',
//     borderRadius: '0.5rem',
//     padding: '0.75rem',
//     fontSize: '1rem',
//     fontWeight: 600,
//     cursor: 'pointer',
//     marginTop: '0.5rem',
//     transition: 'opacity 0.2s',
//   },
//   ghostButton: {
//     background: 'none',
//     border: 'none',
//     color: 'rgba(255,255,255,0.5)',
//     cursor: 'pointer',
//     fontSize: '0.875rem',
//     marginTop: '1rem',
//     width: '100%',
//     textAlign: 'center',
//   },
//   footer: {
//     marginTop: '1.5rem',
//     textAlign: 'center',
//     color: 'rgba(255,255,255,0.5)',
//     fontSize: '0.875rem',
//   },
//   link: {
//     color: '#a78bfa',
//     textDecoration: 'none',
//     fontWeight: 500,
//   },
// }

export default function SignUpPage() {
  return null
}