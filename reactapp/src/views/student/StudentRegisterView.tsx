import { faArrowLeft, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAxios from "axios-hooks";
import { ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Paths } from "@routes/paths.ts";
import Logo from "@images/home/logo640.png";
import "@styles/views/login.scss";

export default function StudentRegisterView(): ReactElement {
    const navigate = useNavigate();

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const [{ loading }, executeRegister] = useAxios(
        { url: "student/register", method: "POST" },
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
                    <p>Create Account</p>
                    <div className={"input__container"}>
                        <label>Username</label>
                        <input
                            autoFocus
                            className={"input__box"}
                            type={"text"}
                            value={username}
                            placeholder={"3–20 characters"}
                            maxLength={20}
                            onChange={(e) => { setError(""); setUsername(e.target.value); }}
                        />
                    </div>
                    <div className={"input__container"}>
                        <label>Password</label>
                        <div className={"input__password-box"}>
                            <input
                                className={"input__box"}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                placeholder={"At least 6 characters"}
                                maxLength={50}
                                onChange={(e) => { setError(""); setPassword(e.target.value); }}
                            />
                            <span className={"input__password-eye"} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword
                                    ? <FontAwesomeIcon icon={faEye} />
                                    : <FontAwesomeIcon icon={faEyeSlash} />}
                            </span>
                        </div>
                    </div>
                    <div className={"input__container"}>
                        <label>Confirm Password</label>
                        <div className={"input__password-box"}>
                            <input
                                className={"input__box"}
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                placeholder={"Repeat password"}
                                maxLength={50}
                                onChange={(e) => { setError(""); setConfirmPassword(e.target.value); }}
                            />
                            <span className={"input__password-eye"} onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm
                                    ? <FontAwesomeIcon icon={faEye} />
                                    : <FontAwesomeIcon icon={faEyeSlash} />}
                            </span>
                        </div>
                    </div>
                </form>
                {error && <p className={"login__error"}>{error}</p>}
                <button
                    className={"button primary-button"}
                    disabled={username === "" || password === "" || confirmPassword === "" || loading}
                    onClick={handleRegister}
                >
                    {loading ? "Creating account..." : "Register"}
                </button>
                <p style={{ fontSize: "0.875rem" }}>
                    Already have an account?{" "}
                    <span
                        style={{ color: "var(--primary-blue)", cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => navigate(Paths.StudentLoginPath)}
                    >
                        Login
                    </span>
                </p>
            </div>
        </div>
    );

    async function handleRegister(): Promise<void> {
        if (username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            await executeRegister({ data: { username, password } });
            navigate(Paths.StudentLoginPath);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
                setError("Username is already taken. Please choose another.");
            } else {
                setError("Registration failed. Please try again.");
            }
        }
    }
}
