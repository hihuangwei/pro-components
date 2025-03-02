import './index.less';
import {
  CopyOutlined,
  CloseOutlined,
  NotificationOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { isBrowser } from '@ant-design/pro-utils';
import { useUrlSearchParams } from '@umijs/use-params';

import { Button, Divider, Drawer, List, Switch, message, Alert } from 'antd';
import React, { useState, useEffect, useRef } from 'react';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import merge from 'lodash.merge';
import omit from 'omit.js';
import type { ProSettings } from '../../defaultSettings';
import defaultSettings from '../../defaultSettings';

import BlockCheckbox from './BlockCheckbox';
import ThemeColor from './ThemeColor';
import getLocales, { getLanguage } from '../../locales';
import { genStringToTheme } from '../../utils/utils';
import LayoutSetting, { renderLayoutSettingItem } from './LayoutChange';
import RegionalSetting from './RegionalChange';

type BodyProps = {
  title: string;
  prefixCls: string;
};

type MergerSettingsType<T> = Partial<T> & {
  primaryColor?: string;
  colorWeak?: boolean;
};

const Body: React.FC<BodyProps> = ({ children, prefixCls, title }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 className={`${prefixCls}-drawer-title`}>{title}</h3>
    {children}
  </div>
);

export type SettingItemProps = {
  title: React.ReactNode;
  action: React.ReactElement;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
};

export type SettingDrawerProps = {
  settings?: MergerSettingsType<ProSettings>;
  collapse?: boolean;
  getContainer?: any;
  publicPath?: string;
  hideLoading?: boolean;
  hideColors?: boolean;
  hideHintAlert?: boolean;
  prefixCls?: string;
  hideCopyButton?: boolean;
  onCollapseChange?: (collapse: boolean) => void;
  onSettingChange?: (settings: MergerSettingsType<ProSettings>) => void;
  pathname?: string;
  disableUrlParams?: boolean;
};

export type SettingDrawerState = {
  collapse?: boolean;
  language?: string;
} & MergerSettingsType<ProSettings>;

const getDifferentSetting = (state: Partial<ProSettings>): Record<string, any> => {
  const stateObj: Partial<ProSettings> = {};
  Object.keys(state).forEach((key) => {
    if (state[key] !== defaultSettings[key] && key !== 'collapse') {
      stateObj[key] = state[key];
    } else {
      stateObj[key] = undefined;
    }
    if (key.includes('Render')) {
      stateObj[key] = state[key] === false ? false : undefined;
    }
  });
  stateObj.menu = undefined;
  return stateObj;
};

export const getFormatMessage = (): ((data: { id: string; defaultMessage?: string }) => string) => {
  const formatMessage = ({ id }: { id: string; defaultMessage?: string }): string => {
    const locales = getLocales();
    return locales[id];
  };
  return formatMessage;
};

const updateTheme = (
  dark: boolean,
  color?: string,
  publicPath = '/theme',
  hideMessageLoading?: boolean,
) => {
  // ssr
  if (typeof window === 'undefined' || !(window as any).umi_plugin_ant_themeVar) {
    return;
  }
  const formatMessage = getFormatMessage();
  let hide: any = () => null;
  if (!hideMessageLoading) {
    hide = message.loading(
      formatMessage({
        id: 'app.setting.loading',
        defaultMessage: '正在加载主题',
      }),
    );
  }

  const href = dark ? `${publicPath}/dark` : `${publicPath}/`;
  // 如果是 dark，并且是 color=daybreak，无需进行拼接
  let colorFileName =
    dark && color ? `-${encodeURIComponent(color)}` : encodeURIComponent(color || '');
  if (color === 'daybreak' && dark) {
    colorFileName = '';
  }

  const dom = document.getElementById('theme-style') as HTMLLinkElement;

  // 如果这两个都是空
  if (!href && !colorFileName) {
    if (dom) {
      dom.remove();
      localStorage.removeItem('site-theme');
    }
    return;
  }

  const url = `${href}${colorFileName || ''}.css`;
  if (dom) {
    dom.onload = () => {
      window.setTimeout(() => {
        hide();
      });
    };
    dom.href = url;
  } else {
    const style = document.createElement('link');
    style.type = 'text/css';
    style.rel = 'stylesheet';
    style.id = 'theme-style';
    style.onload = () => {
      window.setTimeout(() => {
        hide();
      });
    };
    style.href = url;
    if (document.body.append) {
      document.body.append(style);
    } else {
      document.body.appendChild(style);
    }
  }

  localStorage.setItem('site-theme', dark ? 'dark' : 'light');
};

const getThemeList = (settings: Partial<ProSettings>) => {
  const formatMessage = getFormatMessage();
  const list: {
    key: string;
    fileName: string;
    modifyVars: {
      '@primary-color': string;
    };
    theme: 'dark' | 'light';
  }[] = (window as any).umi_plugin_ant_themeVar || [];
  const themeList = [
    {
      key: 'light',
      title: formatMessage({ id: 'app.setting.pagestyle.light' }),
    },
  ];

  const darkColorList: {
    key: string;
    color: string;
    theme: 'dark' | 'light';
  }[] = [
    {
      key: 'daybreak',
      color: '#1890ff',
      theme: 'dark',
    },
  ];

  const lightColorList: {
    key: string;
    color: string;
    theme: 'dark' | 'light';
  }[] = [
    {
      key: 'daybreak',
      color: '#1890ff',
      theme: 'dark',
    },
  ];
  if (settings.layout !== 'mix') {
    themeList.push({
      key: 'dark',
      title: formatMessage({
        id: 'app.setting.pagestyle.dark',
        defaultMessage: '',
      }),
    });
  }

  if (list.find((item) => item.theme === 'dark')) {
    themeList.push({
      key: 'realDark',
      title: formatMessage({
        id: 'app.setting.pagestyle.dark',
        defaultMessage: '',
      }),
    });
  }

  // insert  theme color List
  list.forEach((item) => {
    const color = (item.modifyVars || {})['@primary-color'];
    if (item.theme === 'dark' && color) {
      darkColorList.push({
        color,
        ...item,
      });
    }
    if (!item.theme || item.theme === 'light') {
      lightColorList.push({
        color,
        ...item,
      });
    }
  });

  return {
    colorList: {
      dark: darkColorList,
      light: lightColorList,
    },
    themeList,
  };
};

/**
 * 初始化的时候需要做的工作
 *
 * @param param0
 */
const initState = (
  urlParams: Record<string, any>,
  settings: Partial<ProSettings>,
  onSettingChange: SettingDrawerProps['onSettingChange'],
  publicPath?: string,
) => {
  if (!isBrowser()) return;

  let loadedStyle = false;

  const replaceSetting = {};
  Object.keys(urlParams).forEach((key) => {
    if (defaultSettings[key] || defaultSettings[key] === undefined) {
      replaceSetting[key] = urlParams[key];
    }
  });
  // 同步数据到外部
  onSettingChange?.(merge({}, settings, replaceSetting));

  // 如果 url 中设置主题，进行一次加载。
  if (defaultSettings.navTheme !== urlParams.navTheme && urlParams.navTheme) {
    updateTheme(settings.navTheme === 'realDark', urlParams.primaryColor, publicPath, true);
    loadedStyle = true;
  }
  if (loadedStyle) {
    return;
  }

  // 如果 url 中没有设置主题，并且 url 中的没有加载，进行一次加载。
  if (defaultSettings.navTheme !== settings.navTheme && settings.navTheme) {
    updateTheme(settings.navTheme === 'realDark', settings.primaryColor, publicPath, true);
  }
};

const getParamsFromUrl = (
  urlParams: Record<string, any>,
  settings?: MergerSettingsType<ProSettings>,
) => {
  if (!isBrowser()) return defaultSettings;

  return {
    ...defaultSettings,
    ...(settings || {}),
    ...urlParams,
  };
};

const genCopySettingJson = (settingState: MergerSettingsType<ProSettings>) =>
  JSON.stringify(
    omit(
      {
        ...settingState,
        primaryColor: genStringToTheme(settingState.primaryColor),
      },
      ['colorWeak'],
    ),
    null,
    2,
  );

/**
 * 可视化配置组件
 *
 * @param props
 */
const SettingDrawer: React.FC<SettingDrawerProps> = (props) => {
  const {
    settings: propsSettings = undefined,
    hideLoading = false,
    hideColors,
    hideHintAlert,
    hideCopyButton,
    getContainer,
    onSettingChange,
    prefixCls = 'ant-pro',
    pathname = window.location.pathname,
    disableUrlParams = false,
  } = props;
  const firstRender = useRef<boolean>(true);

  const [show, setShow] = useMergedState(false, {
    value: props.collapse,
    onChange: props.onCollapseChange,
  });
  const [language, setLanguage] = useState<string>(getLanguage());
  const [urlParams, setUrlParams] = useUrlSearchParams({});
  const [settingState, setSettingState] = useMergedState<Partial<ProSettings>>(
    () => getParamsFromUrl(urlParams, propsSettings),
    {
      value: propsSettings,
      onChange: onSettingChange,
    },
  );

  const preStateRef = useRef(settingState);

  const { navTheme, primaryColor, layout, colorWeak } = settingState || {};

  useEffect(() => {
    // 语言修改，这个是和 locale 是配置起来的
    const onLanguageChange = (): void => {
      if (language !== getLanguage()) {
        setLanguage(getLanguage());
      }
    };

    /** 如果不是浏览器 都没有必要做了 */
    if (!isBrowser()) return () => null;
    initState(
      getParamsFromUrl(urlParams, propsSettings),
      settingState,
      setSettingState,
      props.publicPath,
    );
    window.document.addEventListener('languagechange', onLanguageChange, {
      passive: true,
    });

    return () => window.document.removeEventListener('languagechange', onLanguageChange);
  }, []);
  /**
   * 修改设置
   *
   * @param key
   * @param value
   * @param hideMessageLoading
   */
  const changeSetting = (key: string, value: string | boolean, hideMessageLoading?: boolean) => {
    const nextState = { ...preStateRef.current };
    nextState[key] = value;

    if (key === 'navTheme') {
      updateTheme(value === 'realDark', undefined, props.publicPath, !!hideMessageLoading);
      nextState.primaryColor = 'daybreak';
    }

    if (key === 'primaryColor') {
      updateTheme(
        nextState.navTheme === 'realDark',
        value === 'daybreak' ? '' : (value as string),
        props.publicPath,
        !!hideMessageLoading,
      );
    }

    if (key === 'layout') {
      nextState.contentWidth = value === 'top' ? 'Fixed' : 'Fluid';
    }
    if (key === 'layout' && value !== 'mix') {
      nextState.splitMenus = false;
    }
    if (key === 'layout' && value === 'mix') {
      nextState.navTheme = 'light';
    }
    if (key === 'colorWeak' && value === true) {
      const dom = document.querySelector('body');
      if (dom) {
        dom.dataset.prosettingdrawer = dom.style.filter;
        dom.style.filter = 'invert(80%)';
      }
    }
    if (key === 'colorWeak' && value === false) {
      const dom = document.querySelector('body');
      if (dom) {
        dom.style.filter = dom.dataset.prosettingdrawer || 'none';
        delete dom.dataset.prosettingdrawer;
      }
    }
    preStateRef.current = nextState;
    setSettingState(nextState);
  };

  const formatMessage = getFormatMessage();
  const themeList = getThemeList(settingState);

  useEffect(() => {
    /** 如果不是浏览器 都没有必要做了 */
    if (!isBrowser()) return;
    if (disableUrlParams) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const diffParams = getDifferentSetting({ ...urlParams, ...settingState });
    setUrlParams(diffParams);
  }, [setUrlParams, settingState, urlParams, pathname, disableUrlParams]);
  const baseClassName = `${prefixCls}-setting`;
  return (
    <Drawer
      visible={show}
      width={300}
      onClose={() => setShow(false)}
      placement="right"
      getContainer={getContainer}
      handler={
        <div className={`${baseClassName}-drawer-handle`} onClick={() => setShow(!show)}>
          {show ? (
            <CloseOutlined
              style={{
                color: '#fff',
                fontSize: 20,
              }}
            />
          ) : (
            <SettingOutlined
              style={{
                color: '#fff',
                fontSize: 20,
              }}
            />
          )}
        </div>
      }
      style={{
        zIndex: 999,
      }}
    >
      <div className={`${baseClassName}-drawer-content`}>
        <Body
          title={formatMessage({
            id: 'app.setting.pagestyle',
            defaultMessage: 'Page style setting',
          })}
          prefixCls={baseClassName}
        >
          <BlockCheckbox
            prefixCls={baseClassName}
            list={themeList.themeList}
            value={navTheme!}
            configType="theme"
            key="navTheme"
            onChange={(value) => changeSetting('navTheme', value, hideLoading)}
          />
        </Body>
        <Body
          title={formatMessage({
            id: 'app.setting.themecolor',
            defaultMessage: 'Theme color',
          })}
          prefixCls={baseClassName}
        >
          <ThemeColor
            value={primaryColor!}
            colors={
              hideColors ? [] : themeList.colorList[navTheme === 'realDark' ? 'dark' : 'light']
            }
            formatMessage={formatMessage}
            onChange={(color) => changeSetting('primaryColor', color, hideLoading)}
          />
        </Body>

        <Divider />

        <Body prefixCls={baseClassName} title={formatMessage({ id: 'app.setting.navigationmode' })}>
          <BlockCheckbox
            prefixCls={baseClassName}
            value={layout!}
            key="layout"
            configType="layout"
            list={[
              {
                key: 'side',
                title: formatMessage({ id: 'app.setting.sidemenu' }),
              },
              {
                key: 'top',
                title: formatMessage({ id: 'app.setting.topmenu' }),
              },
              {
                key: 'mix',
                title: formatMessage({ id: 'app.setting.mixmenu' }),
              },
            ]}
            onChange={(value) => changeSetting('layout', value, hideLoading)}
          />
        </Body>
        <LayoutSetting settings={settingState} changeSetting={changeSetting} />
        <Divider />

        <Body
          prefixCls={baseClassName}
          title={formatMessage({ id: 'app.setting.regionalsettings' })}
        >
          <RegionalSetting settings={settingState} changeSetting={changeSetting} />
        </Body>

        <Divider />

        <Body prefixCls={baseClassName} title={formatMessage({ id: 'app.setting.othersettings' })}>
          <List
            split={false}
            renderItem={renderLayoutSettingItem}
            dataSource={[
              {
                title: formatMessage({ id: 'app.setting.weakmode' }),
                action: (
                  <Switch
                    size="small"
                    className="color-weak"
                    checked={!!colorWeak}
                    onChange={(checked) => {
                      changeSetting('colorWeak', checked);
                    }}
                  />
                ),
              },
            ]}
          />
        </Body>
        {hideHintAlert && hideCopyButton ? null : <Divider />}

        {hideHintAlert ? null : (
          <Alert
            type="warning"
            message={formatMessage({
              id: 'app.setting.production.hint',
            })}
            icon={<NotificationOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {hideCopyButton ? null : (
          <Button
            block
            icon={<CopyOutlined />}
            style={{ marginBottom: 24 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(genCopySettingJson(settingState));
                message.success(formatMessage({ id: 'app.setting.copyinfo' }));
              } catch (error) {
                // console.log(error);
              }
            }}
          >
            {formatMessage({ id: 'app.setting.copy' })}
          </Button>
        )}
      </div>
    </Drawer>
  );
};

export default SettingDrawer;
