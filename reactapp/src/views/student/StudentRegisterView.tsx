import { faArrowLeft, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAxios from "axios-hooks";
import { ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Paths } from "@routes/paths.ts";
import { TranslationNamespaces } from "@/i18n.ts";
import Logo from "@images/home/logo640.png";
import "@styles/views/login.scss";

export default function StudentRegisterView(): ReactElement {
    const navigate = useNavigate();
    const { t } = useTranslation(TranslationNamespaces.Student);

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
                {t("student-register-back")}
            </button>
            <div className={"login__container"}>
                <img src={Logo} alt={"AlgeSpace logo"} />
                <form className={"login__form"} onSubmit={(e) => e.preventDefault()}>
                    <p>{t("student-register-title")}</p>
                    <div className={"input__container"}>
                        <label>{t("student-register-username")}</label>
                        <input
                            autoFocus
                            className={"input__box"}
                            type={"text"}
                            value={username}
                            placeholder={t("student-register-username-placeholder")}
                            maxLength={20}
                            onChange={(e) => { setError(""); setUsername(e.target.value); }}
                        />
                    </div>
                    <div className={"input__container"}>
                        <label>{t("student-register-password")}</label>
                        <div className={"input__password-box"}>
                            <input
                                className={"input__box"}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                placeholder={t("student-register-password-placeholder")}
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
                        <label>{t("student-register-confirm")}</label>
                        <div className={"input__password-box"}>
                            <input
                                className={"input__box"}
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                placeholder={t("student-register-confirm-placeholder")}
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
                    {loading ? t("student-register-loading") : t("student-register-submit")}
                </button>
                <p style={{ fontSize: "0.875rem" }}>
                    {t("student-register-have-account")}{" "}
                    <span
                        style={{ color: "var(--primary-blue)", cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => navigate(Paths.StudentLoginPath)}
                    >
                        {t("student-register-login-link")}
                    </span>
                </p>
            </div>
        </div>
    );

    async function handleRegister(): Promise<void> {
        if (username.length < 3) {
            setError(t("student-register-error-username-short"));
            return;
        }
        if (password.length < 6) {
            setError(t("student-register-error-password-short"));
            return;
        }
        if (password !== confirmPassword) {
            setError(t("student-register-error-passwords-mismatch"));
            return;
        }

        try {
            await executeRegister({ data: { username, password } });
            navigate(Paths.StudentLoginPath);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
                setError(t("student-register-error-username-taken"));
            } else {
                setError(t("student-register-error-generic"));
            }
        }
    }
}
