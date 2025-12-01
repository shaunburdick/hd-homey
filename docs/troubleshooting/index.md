# Troubleshooting

Having issues with HD Homey? This guide covers common problems and their solutions.

## Quick Diagnostics

Before diving into specific issues, check these basics:

1. **Check container/process status**:
   ```bash
   docker ps  # If using Docker
   # or
   systemctl status hd-homey  # If using systemd
   ```

2. **View logs**:
   ```bash
   docker logs hd-homey  # Docker
   # or
   journalctl -u hd-homey  # systemd
   ```

3. **Verify environment variables**:
   ```bash
   docker exec hd-homey env | grep HD_HOMEY
   ```

4. **Test network connectivity**:
   ```bash
   # From HD Homey container to HDHomeRun device
   docker exec hd-homey curl http://YOUR_HDHR_IP/discover.json
   ```

## Common Issues

### Authentication Problems

#### Can't log in / Authentication loops
**Symptoms**: Login page keeps reloading, or "Unauthorized" errors

**Solutions**:
1. Verify `AUTH_SECRET` is set and consistent across restarts
2. Clear browser cookies for the site
3. Check that `BETTER_AUTH_URL` matches your access URL (or leave blank for auto-detection)
4. Ensure system time is correct (JWT tokens are time-sensitive)

```bash
# Verify AUTH_SECRET is set
docker exec hd-homey env | grep AUTH_SECRET

# Regenerate if needed
openssl rand -base64 32
```

#### "Forbidden" or "Unauthorized" errors
**Symptoms**: Can access some pages but not others

**Solutions**:
1. Check user role (admin vs viewer)
2. Verify session hasn't expired
3. Refresh the page to update session
4. Re-login to create fresh session

### Streaming Issues

#### Streams won't play
**Symptoms**: Video player shows error or infinite loading

**Solutions**:
1. **Check tuner connectivity**:
   - Go to Tuners page
   - Click "Test Connection" on your tuner
   - Verify tuner shows green/online status

2. **Verify channel availability**:
   - Refresh channel lineup
   - Check if channel plays on HDHomeRun directly
   - Try different channel to isolate issue

3. **Browser codec support**:
   - Most browsers don't support MPEG-2 natively
   - Use transcoded stream (HLS option)
   - Or use external player like VLC

4. **Check stream tokens**:
   - Tokens are time-limited (default 24 hours)
   - Regenerate stream URL if expired
   - Check `HD_HOMEY_PROXY_HOST` is set correctly (or verify auto-detection works)

#### Transcoding fails
**Symptoms**: HLS streams won't start, transcoding errors in logs

**Solutions**:
1. **Verify FFmpeg is installed**:
   ```bash
   docker exec hd-homey ffmpeg -version
   ```

2. **Check disk space**:
   ```bash
   df -h  # Transcoded segments need temp storage
   ```

3. **Review FFmpeg logs**:
   ```bash
   docker logs hd-homey 2>&1 | grep -i ffmpeg
   ```

4. **Increase timeout** if streams are slow to start:
   - Network buffering may need more time
   - Check bandwidth between HD Homey and HDHomeRun

### Tuner Issues

#### HDHomeRun device not found
**Symptoms**: Auto-discovery doesn't find tuner, manual add fails

**Solutions**:
1. **Check network connectivity**:
   ```bash
   # From HD Homey host
   ping YOUR_HDHR_IP
   curl http://YOUR_HDHR_IP/discover.json
   ```

2. **Verify Docker network mode**:
   - Use `network_mode: host` for auto-discovery
   - Or manually add tuner with IP address

3. **Check firewall rules**:
   - HDHomeRun uses port 80 for API
   - UDP port 65001 for discovery

4. **Verify HDHomeRun is online**:
   - Check LED on device
   - Access web interface at `http://YOUR_HDHR_IP`
   - Restart HDHomeRun device

#### Channels not updating
**Symptoms**: Old channels shown, lineup doesn't refresh

**Solutions**:
1. **Manual refresh**:
   - Go to Channels page
   - Click "Refresh Lineup"
   
2. **Check tuner configuration**:
   - Verify tuner is online
   - Test connection to tuner
   - Check antenna/cable signal

3. **Database issues**:
   - Check database file permissions
   - Verify `HD_HOMEY_DB_PATH` parent directory is writable
   - Review logs for database errors

### Database Problems

#### "Unable to open database" error
**Symptoms**: Application won't start, database errors in logs

**Solutions**:
1. **Check file permissions**:
   ```bash
   # Check parent directory of HD_HOMEY_DB_PATH
   ls -la $(dirname /path/to/hd_homey.db)
   # Should be writable by HD Homey process user
   ```

2. **Verify parent directory exists** (HD Homey creates it automatically, but check permissions):
   ```bash
   mkdir -p $(dirname /path/to/hd_homey.db)
   ```

3. **Check disk space**:
   ```bash
   df -h /path/to
   ```

4. **Restore from backup** if database is corrupted:
   ```bash
   cp /path/to/backup/hd_homey.db /path/to/hd_homey.db
   ```

#### Migration failures
**Symptoms**: App won't start after update, migration errors

**Solutions**:
1. **Backup database first**:
   ```bash
   cp hd_homey.db hd_homey.db.backup
   ```

2. **Check migration logs**:
   ```bash
   docker logs hd-homey 2>&1 | grep -i migration
   ```

3. **Manual migration** (last resort):
   ```bash
   docker exec -it hd-homey npm run db:migrate
   ```

### Remote Access Issues

#### Can't access HD Homey remotely
**Symptoms**: Works on local network, not from internet

**Solutions**:
[See detailed guide →](/troubleshooting/)

Quick checklist:
1. Port forwarding configured (port 3000)
2. Firewall allows incoming connections
3. `HD_HOMEY_PROXY_HOST` set to external URL (or verify auto-detection works)
4. `AUTH_TRUST_HOST=true` if behind reverse proxy (for auto-detection)
5. HTTPS recommended for security

### Performance Issues

#### Slow page loads
**Symptoms**: Web interface is sluggish

**Solutions**:
1. **Check resource usage**:
   ```bash
   docker stats hd-homey
   ```

2. **Review logs for errors**:
   ```bash
   docker logs hd-homey --tail 100
   ```

3. **Increase container resources** if needed:
   ```yaml
   # compose.yml
   services:
     hd-homey:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

#### High CPU usage
**Symptoms**: CPU consistently high, fans spinning

**Solutions**:
1. **Check active transcode sessions**:
   - Multiple users streaming = multiple transcodes
   - Consider hardware transcoding (future feature)

2. **Reduce transcode quality**:
   - Lower bitrate in transcoding settings
   - Adjust preset (faster = less CPU, lower quality)

3. **Limit concurrent streams**:
   - Add message for users about capacity
   - Consider upgrading hardware

## Still Having Issues?

If your problem isn't covered here:

1. **Check logs** carefully for error messages
2. **Search [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)** for similar problems
3. **Create a new issue** with:
   - HD Homey version
   - Installation method (Docker/source)
   - Complete error messages
   - Steps to reproduce
   - Environment details

## Related Resources

- [Installation Guide](/getting-started/installation)
- [Configuration](/config/)
- [API Documentation](/api/)
- [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)
