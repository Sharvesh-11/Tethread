"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setErrorMessage("");

		try {
			await loginUser(email, password);
			router.push("/");
		} catch {
			setErrorMessage("Invalid email or password");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen items-center justify-center bg-cream px-4 py-10 sm:px-6 lg:px-8">
			<section className="w-full max-w-md rounded-2xl bg-warm-white p-8 shadow-[0_18px_50px_-30px_rgba(61,61,61,0.45)] sm:p-10">
				<Link
					href="/"
					className="block text-center font-display text-3xl font-semibold text-sage"
				>
					Tethread 🧶
				</Link>

				<div className="mt-8 text-center">
					<h1 className="font-display text-3xl font-semibold text-charcoal sm:text-4xl">
						Welcome Back
					</h1>
					<p className="mt-3 text-sm text-charcoal/70 sm:text-base">
						Sign in to your account
					</p>
				</div>

				<button
					type="button"
					onClick={() => signIn("google", { callbackUrl: "/" })}
					className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-charcoal/30 bg-white text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
				>
					<span aria-hidden="true" className="text-base font-bold leading-none">
						<span style={{ color: "#4285F4" }}>G</span>
					</span>
					Continue with Google
				</button>

				<div className="mt-5 flex items-center gap-3">
					<div className="h-px flex-1 bg-sage/50" />
					<span className="text-xs text-charcoal/55">or continue with email</span>
					<div className="h-px flex-1 bg-sage/50" />
				</div>

				<form className="mt-8 space-y-5" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="email" className="mb-2 block text-sm font-medium text-charcoal">
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full rounded-xl border border-transparent bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:border-sage focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)]"
							placeholder="you@example.com"
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-2 block text-sm font-medium text-charcoal">
							Password
						</label>
						<div className="relative">
							<input
								id="password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="w-full rounded-xl border border-transparent bg-cream px-4 py-3 pr-20 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:border-sage focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)]"
								placeholder="Enter your password"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-sage transition-colors duration-200 hover:text-charcoal"
							>
								{showPassword ? "Hide" : "Show"}
							</button>
						</div>
					</div>

					<div className="flex justify-end">
						<Link
							href="#"
							className="text-sm font-medium text-sage transition-colors duration-200 hover:text-charcoal"
						>
							Forgot password?
						</Link>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="inline-flex h-12 w-full items-center justify-center rounded-full bg-sage text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isLoading ? "Logging in..." : "Login"}
					</button>

					<p className="text-center text-sm text-charcoal/70">
						Don&apos;t have an account?{" "}
						<Link href="/register" className="font-medium text-sage transition-colors duration-200 hover:text-charcoal">
							Register
						</Link>
					</p>
				</form>

				{errorMessage ? (
					<p className="mt-4 text-center text-sm text-rose-soft">{errorMessage}</p>
				) : null}
			</section>
		</main>
	);
}
