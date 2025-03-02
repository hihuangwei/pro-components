﻿import type { ButtonProps, InputProps } from 'antd';
import { Button, Input, Form } from 'antd';
import type { NamePath } from 'antd/lib/form/interface';
import React, { useState, useCallback, useEffect } from 'react';
import createField from '../../BaseForm/createField';
import type { ProFormFieldItemProps } from '../../interface';

export type ProFormCaptchaProps = ProFormFieldItemProps<InputProps> & {
  /** @name 倒计时的秒数 */
  countDown?: number;

  /** 手机号的 name */
  phoneName?: NamePath;

  /** @name 获取验证码的方法 */
  onGetCaptcha: (mobile: string) => Promise<void>;

  /** @name 渲染按钮的文字 */
  captchaTextRender?: (timing: boolean, count: number) => React.ReactNode;

  /** @name 获取按钮验证码的props */
  captchaProps?: ButtonProps;

  value?: any;
  onChange?: any;
};

const ProFormCaptcha: React.FC<ProFormCaptchaProps> = React.forwardRef((props, ref: any) => {
  const [count, setCount] = useState<number>(props.countDown || 60);
  const [timing, setTiming] = useState(false);
  const [loading, setLoading] = useState<boolean>();
  // 这么写是为了防止restProps中 带入 onChange, defaultValue, rules props tabUtil
  const {
    rules,
    name,
    phoneName,
    fieldProps,
    captchaTextRender = (paramsTiming, paramsCount) => {
      return paramsTiming ? `${paramsCount} 秒后重新获取` : '获取验证码';
    },
    captchaProps,
    ...restProps
  } = props;

  const onGetCaptcha = useCallback(async (mobile: string) => {
    try {
      setLoading(true);
      await restProps.onGetCaptcha(mobile);
      setLoading(false);
      setTiming(true);
    } catch (error) {
      setLoading(false);
      // eslint-disable-next-line no-console
      console.log(error);
    }
  }, []);

  useEffect(() => {
    let interval: number = 0;
    const { countDown } = props;
    if (timing) {
      interval = window.setInterval(() => {
        setCount((preSecond) => {
          if (preSecond <= 1) {
            setTiming(false);
            clearInterval(interval);
            // 重置秒数
            return countDown || 60;
          }
          return preSecond - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timing]);

  return (
    <Form.Item noStyle shouldUpdate>
      {({ getFieldValue, validateFields }) => (
        <div
          style={{
            ...fieldProps?.style,
            display: 'flex',
            alignItems: 'center',
          }}
          ref={ref}
        >
          <Input
            {...fieldProps}
            style={{
              flex: 1,
              transition: 'width .3s',
              marginRight: 8,
            }}
          />
          <Button
            style={{
              display: 'block',
            }}
            disabled={timing}
            loading={loading}
            {...captchaProps}
            onClick={async () => {
              try {
                if (phoneName) {
                  await validateFields([phoneName].flat(1) as string[]);
                  const mobile = getFieldValue([phoneName].flat(1) as string[]);
                  await onGetCaptcha(mobile);
                } else {
                  await onGetCaptcha('');
                }
              } catch (error) {
                // eslint-disable-next-line no-console
                console.log(error);
              }
            }}
          >
            {captchaTextRender(timing, count)}
          </Button>
        </div>
      )}
    </Form.Item>
  );
});

export default createField(ProFormCaptcha);
