import React from 'react';
import { FiCheck, FiHelpCircle, FiLock, FiMail, FiShield, FiUser } from 'react-icons/fi';
import { REGISTRATION_STEPS } from '../../services/registrationFlowService';

const STEP_ICON_MAP = {
  1: FiUser,
  2: FiMail,
  3: FiShield,
  4: FiLock,
};

const AuthShell = ({
  layout = 'default',
  badge = 'BusDN',
  title = '',
  description = '',
  step = 0,
  sideTitle = 'Build your BusDN account in four steps.',
  sideDescription = 'Follow the guided process to create your account and start exploring our services.',
  children,
  footer = null,
  headerIcon: HeaderIconProp = null,
  showStepRail = step > 0,
}) => {
  const progress = step > 0 ? Math.round((step / REGISTRATION_STEPS.length) * 100) : 0;
  const HeaderIcon = HeaderIconProp || STEP_ICON_MAP[step] || FiLock;
  const isSplitLayout = layout === 'split';

  return (
    <div className="auth-shell bg-[#f2fcf8] text-[#141d1b]">
      <main className="flex min-h-[100dvh] lg:h-[100dvh]">
        <aside
          className={`relative hidden shrink-0 overflow-hidden bg-[#001a0f] px-8 py-8 xl:px-10 xl:py-9 lg:flex ${isSplitLayout ? 'lg:w-[35%]' : 'w-88'}`}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#2ba471] blur-[110px]" />
          </div>

          <div className="relative z-10 flex h-full flex-col">
            <div className="inline-flex w-fit rounded-full border border-[#2ba471]/20 bg-[#17503a]/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#b5efd1]">
              {badge}
            </div>

            <h1 className="auth-headline mt-6 text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-white">
              {sideTitle}
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-6 text-[#c4ebd7]/72">
              {sideDescription}
            </p>

            {showStepRail ? (
              <nav className="mt-10 flex flex-col gap-1.5">
                {REGISTRATION_STEPS.map((item) => {
                  const active = item.id === step;
                  const completed = step > item.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-5 py-3 transition ${
                        active
                          ? 'rounded-r-full border-l-4 border-[#2ba471] bg-[#003120] text-[#b5efd1] shadow-lg'
                          : 'text-[#c4ebd7]'
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          active || completed ? 'bg-[#2ba471]' : 'bg-[#0f2b1e]'
                        }`}
                      >
                        {completed ? (
                          <FiCheck className="text-sm font-bold text-[#001a0f]" />
                        ) : (
                          <span className={`text-sm font-bold ${active ? 'text-[#001a0f]' : 'text-[#b5efd1]'}`}>
                            {item.id}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-medium tracking-wide ${active ? 'text-[#b5efd1]' : 'opacity-60'}`}>
                        {item.title}
                      </span>
                    </div>
                  );
                })}
              </nav>
            ) : (
              <div className="mt-10 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2ba471]">Account access</p>
                  <p className="mt-2 text-sm leading-6 text-[#e9f3ef]/80">
                    Sign in to continue booking, profile updates, monthly passes, and the new guided registration flow.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2ba471]">Google supported</p>
                  <p className="mt-2 text-sm leading-6 text-[#c4ebd7]/80">
                    Use email, phone, or Google auth from the same frontend shell.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section
          className={`flex flex-1 items-center justify-center overflow-y-auto bg-[#f2fcf8] p-4 sm:p-6 lg:px-8 lg:py-6 xl:px-10 xl:py-8 no-scrollbar ${
            isSplitLayout ? 'lg:w-[65%]' : ''
          }`}
        >
          <div className="flex w-full max-w-[32rem] flex-col justify-center gap-4 lg:max-h-full lg:gap-3">
            {step > 0 ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold tracking-[0.16em] text-[#426656]">
                    Step {step} / {REGISTRATION_STEPS.length} - {progress}%
                  </span>
                  <h2 className="auth-headline mt-1 text-[1.9rem] font-extrabold tracking-tight text-[#001a0f]">
                    {title}
                  </h2>
                  {description ? (
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#466a5a]">
                      {description}
                    </p>
                  ) : null}
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-[#dbe5e1] p-1">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#2ba471] text-[#001a0f]">
                    <HeaderIcon className="text-lg" />
                  </div>
                </div>
              </div>
            ) : title || description ? (
              <div className="rounded-2xl border border-[#dbe5e1] bg-[#ecf6f2] p-4 sm:p-5">
                <span className="inline-flex rounded-full bg-[#c1e9d5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#17503a]">
                  {badge}
                </span>
                <h2 className="auth-headline mt-3 text-[1.9rem] font-extrabold tracking-tight text-[#001a0f]">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#466a5a]">
                    {description}
                  </p>
                ) : null}
              </div>
            ) : null}

            {children}
            {footer ? <div className="flex flex-col items-center gap-1.5">{footer}</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuthShell;
