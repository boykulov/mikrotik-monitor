# NebulaNet Monitor — Деплой нового клиента

## Требования
- Ubuntu 20.04+ / Debian 11+
- 2GB RAM минимум (4GB рекомендуется)
- 20GB диск
- Открытые порты: 8000 (веб), 2055/udp (NetFlow), 514/udp (Syslog)

## Установка (5 минут)

### 1. На сервере клиента
```bash
curl -fsSL https://raw.githubusercontent.com/boykulov/mikrotik-monitor/main/deploy-template/install.sh | sudo bash
```

### 2. Или вручную
```bash
git clone https://github.com/boykulov/mikrotik-monitor.git
cd mikrotik-monitor
sudo bash deploy-template/install.sh
```

## После установки

### Настройка MikroTik
Выполни на устройстве клиента:
```
/user add name=nebulanet password=ПАРОЛЬ group=write

/ip traffic-flow set enabled=yes interfaces=all
/ip traffic-flow set active-flow-timeout=1m inactive-flow-timeout=15s
/ip traffic-flow target add dst-address=IP_СЕРВЕРА port=2055 version=9

/ip dns set allow-remote-requests=yes
/system logging action set remote remote=IP_СЕРВЕРА remote-port=514
/system logging add topics=dns action=remote
/system logging add topics=dhcp action=remote
```

### Добавление в Super Admin v2.0
1. Зайди на admin.nebulanet.uz:3001
2. Создай организацию → получи License Key
3. Скопируй License Key → вставь при установке

## Управление
```bash
cd /opt/nebulanet

# Статус
docker compose ps

# Логи
docker compose logs api -f

# Перезапуск
docker compose restart

# Обновление
git pull && docker compose up -d --build
```

## Порты
| Порт | Протокол | Назначение |
|------|----------|------------|
| 8000 | TCP | Веб интерфейс мониторинга |
| 2055 | UDP | NetFlow v9 от MikroTik |
| 514  | UDP | Syslog DNS от MikroTik |
