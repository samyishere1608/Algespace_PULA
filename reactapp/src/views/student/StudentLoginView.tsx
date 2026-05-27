import { useAuth } from "@/contexts/AuthProvider.tsx";
import { IStudent } from "@/types/student/student.ts";
import { faArrowLeft, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAxios from "axios-hooks";
import { ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Paths } from "@routes/paths.ts";
import { getOnboardingStep, setOnboardingStep } from "@utils/storageUtils.ts";
import Logo from "@images/home/logo640.png";
import "@styles/views/login.scss";

export default function StudentLoginView(): ReactElement {
    const navigate = useNavigate();
    const { loginStudent } = useAuth();

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const [{ loading }, executeLogin] = useAxios(
        { url: "student/authenticate", method: "POST" },
        { manual: true }
    );

    return (
        <div className={"login__background"}>
            <button className={"text-button--white login__return-button"} onClick={() => navigate(Paths.HomePath)}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Back to Home
            </button>
            <div className={"login__container"}>
                <img src={Logo} alt={"AlgeSpace logo"} />
                <form className={"login__form"} onSubmit={(e) => e.preventDefault()}>
                    <p>Student Login</p>
                    <div className={"input__container"}>
                        <label>Username</label>
                        <input
                            autoFocus
                            className={"input__box"}
                            type={"text"}
                            value={username}
                            placeholder={"Username"}
                            maxLength={20}
                            onChange={(e) => { setError(""); setUsername(e.target.value); }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className={"input__container"}>
                        <label>Password</label>
                        <div className={"input__password-box"}>
                            <input
                                className={"input__box"}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                placeholder={"Password"}
                                maxLength={50}
                                onChange={(e) => { setError(""); setPassword(e.target.value); }}
                                onKeyDown={handleKeyDown}
                            />
                            <span className={"input__password-eye"} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword
                                    ? <FontAwesomeIcon icon={faEye} />
                                    : <FontAwesomeIcon icon={faEyeSlash} />}
                            </span>
                        </div>
                    </div>
                </form>
                {error && <p className={"login__error"}>{error}</p>}
                <button
                    className={"button primary-button"}
                    disabled={username === "" || password === "" || loading}
                    onClick={handleLogin}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
                <p style={{ fontSize: "0.875rem" }}>
                    Don't have an account?{" "}
                    <span
                        style={{ color: "var(--primary-blue)", cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => navigate(Paths.StudentRegisterPath)}
                    >
                        Register
                    </span>
                </p>
            </div>
        </div>
    );

    function handleKeyDown(event: React.KeyboardEvent): void {
        if (event.key === "Enter" && username !== "" && password !== "" && !loading) {
            handleLogin();
        }
    }

    async function handleLogin(): Promise<void> {
        try {
            const response = await executeLogin({ data: { username, password } });
            const student = response.data as IStudent;
            loginStudent(student);

            const step = getOnboardingStep(student.id);

            if (step === "complete") {
                navigate(Paths.StudentDashboardPath);
                return;
            }

            // First login: start onboarding
            if (step === null) {
                setOnboardingStep(student.id, "bartering");
            }

            // Navigate to resume page which will redirect to the right tutorial
            navigate(Paths.OnboardingResumePath);
        } catch {
            setError("Username or password is incorrect.");
        }
    }
}
