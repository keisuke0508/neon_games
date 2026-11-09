import Link from 'next/link';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './AppButton.module.scss';

export type AppButtonVariant = 'primary' | 'danger' | 'secondary';

type CommonProps = {
  variant?: AppButtonVariant;
  children: ReactNode;
  className?: string;
};

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithRef<'button'>, 'className' | 'children'> & {
    href?: undefined;
  };

type LinkProps = CommonProps & {
  /** 指定するとリンク（next/link）として描画する */
  href: string;
};

export type AppButtonProps = ButtonProps | LinkProps;

/** 共通ボタン（docs/design.md §5 AppButton） */
export function AppButton(props: AppButtonProps) {
  const { variant = 'primary', className, children } = props;
  const classNames = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classNames}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, className: _c, children: _ch, href: _h, type = 'button', ...rest } = props;
  return (
    <button type={type} className={classNames} {...rest}>
      {children}
    </button>
  );
}
