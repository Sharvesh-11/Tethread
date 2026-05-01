"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { registerUser } from "@/lib/api";

type FormErrors = {
	fullName?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPasswordStrength = (password: string) => {
	const hasNumber = /\d/.test(password);
	const hasSpecialCharacter = /[!@#$%^&*]/.test(password);
	const hasUppercase = /[A-Z]/.test(password);

	if (
		password.length >= 8 &&
		hasNumber &&
		hasSpecialCharacter &&
		hasUppercase
	) {
		return {
			label: "Strong",
			className: "text-green-600",
			barClassName: "bg-green-500",
			barWidth: "w-full",
		};
	}

	if (password.length >= 6 && (hasNumber || hasSpecialCharacter)) {
		return {
			label: "Medium",
			className: "text-yellow-500",
			barClassName: "bg-yellow-400",
			barWidth: "w-2/3",
		};
	}

	return {
		label: "Weak",
		className: "text-red-500",
		barClassName: "bg-red-500",
		barWidth: "w-1/4",
	};
};

export default function RegisterPage() {
	const router = useRouter();
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [errors, setErrors] = useState<FormErrors>({});
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const passwordStrength = getPasswordStrength(password);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage("");

		const nextErrors: FormErrors = {};

		if (!fullName.trim()) {
			nextErrors.fullName = "Full name is required.";
		}

		if (!emailPattern.test(email)) {
			nextErrors.email = "Enter a valid email address.";
		}

		if (!password) {
			nextErrors.password = "Password is required.";
		}

		if (password !== confirmPassword) {
			nextErrors.confirmPassword = "Passwords do not match.";
		}

		setErrors(nextErrors);

		if (Object.keys(nextErrors).length > 0) {
			return;
		}

		setIsLoading(true);

		try {
			await registerUser(fullName, email, password, undefined);
			router.push("/login?registered=1");
			
		} catch (error: any) {
			setErrorMessage(error.message);
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
						Create Account
					</h1>
					<p className="mt-3 text-sm text-charcoal/70 sm:text-base">
						Join the Tethread family 🧶
					</p>
				</div>

				<button
					type="button"
					onClick={() => signIn("google")}
					className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full border border-charcoal/30 bg-white text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
				>
					Sign up with Google
				</button>

				<div className="mt-5 flex items-center gap-3">
					<div className="h-px flex-1 bg-sage/50" />
					<span className="text-xs text-charcoal/55">or create account with email</span>
					<div className="h-px flex-1 bg-sage/50" />
				</div>

				<form className="mt-8 space-y-5" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="fullName" className="mb-2 block text-sm font-medium text-charcoal">
							Full Name
						</label>
						<input
							id="fullName"
							type="text"
							value={fullName}
							onChange={(event) => setFullName(event.target.value)}
							className="w-full rounded-xl border border-transparent bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:border-sage focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)]"
							placeholder="Your full name"
						/>
						{errors.fullName && (
							<p className="mt-2 text-xs text-red-500">{errors.fullName}</p>
						)}
					</div>

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
						{errors.email && <p className="mt-2 text-xs text-red-500">{errors.email}</p>}
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
								placeholder="Create a password"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-sage transition-colors duration-200 hover:text-charcoal"
							>
								{showPassword ? "Hide" : "Show"}
							</button>
						</div>
						<div className="mt-2">
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/10">
								<div
									className={`h-full rounded-full ${passwordStrength.barClassName} ${passwordStrength.barWidth}`}
								/>
							</div>
							<div className="mt-2 flex items-center justify-between text-xs">
								<span className="text-charcoal/60">Password strength</span>
								<span className={`font-semibold ${passwordStrength.className}`}>
									{passwordStrength.label}
								</span>
							</div>
						</div>
						{errors.password && <p className="mt-2 text-xs text-red-500">{errors.password}</p>}
					</div>

					<div>
						<label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-charcoal">
							Confirm Password
						</label>
						<div className="relative">
							<input
								id="confirmPassword"
								type={showConfirmPassword ? "text" : "password"}
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
								className="w-full rounded-xl border border-transparent bg-cream px-4 py-3 pr-20 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:border-sage focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)]"
								placeholder="Confirm your password"
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword((prev) => !prev)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-sage transition-colors duration-200 hover:text-charcoal"
							>
								{showConfirmPassword ? "Hide" : "Show"}
							</button>
						</div>
						{errors.confirmPassword && (
							<p className="mt-2 text-xs text-red-500">{errors.confirmPassword}</p>
						)}
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="inline-flex h-12 w-full items-center justify-center rounded-full bg-sage text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isLoading ? "Creating account..." : "Create Account"}
					</button>

					<p className="text-center text-sm text-charcoal/70">
						Already have an account?{" "}
						<Link href="/login" className="font-medium text-sage transition-colors duration-200 hover:text-charcoal">
							Sign in
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
