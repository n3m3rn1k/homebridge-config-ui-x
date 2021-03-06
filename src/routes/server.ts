import * as qr from 'qr-image';
import * as child_process from 'child_process';
import { Router, Request, Response, NextFunction } from 'express';

import { hb } from '../hb';
import { users } from '../users';
import { qrcode } from '../qrcode';

export class ServerRouter {
  public router: Router;

  constructor() {
    this.router = Router();

    this.router.put('/restart', this.restartServer);
    this.router.put('/reset-homebridge', users.ensureAdmin, this.resetHomebridgeAccessory);
    this.router.get('/qrcode.svg', this.getQrCode);
    this.router.get('/token', this.getToken);
  }

  restartServer(req: Request, res: Response, next: NextFunction) {
    hb.log('Homebridge restart request received');
    res.status(202).json({ ok: true, command: hb.restartCmd });

    setTimeout(() => {
      if (hb.restartCmd) {
        hb.log(`Executing restart command: ${hb.restartCmd}`);
        child_process.exec(hb.restartCmd, (err) => {
          if (err) {
            hb.log('Restart command exited with an error. Failed to restart Homebridge.');
          }
        });
      } else if (hb.restartCmd !== false) {
        hb.log(`No restart command defined, killing process...`);
        process.exit(1);
      }
    }, 100);
  }

  resetHomebridgeAccessory(req: Request, res: Response, next: NextFunction) {
    return hb.resetHomebridgeAccessory()
      .then(() => {
        res.json({ok: true});
      })
      .catch(next);
  }

  getQrCode(req: Request, res: Response, next: NextFunction) {
    const data = qrcode.getCode();

    if (!data) {
      return res.sendStatus(404);
    }

    const qrSvg = qr.image(data, { type: 'svg' });
    res.setHeader('Content-type', 'image/svg+xml');
    qrSvg.pipe(res);
  }

  getToken(req: Request, res: Response, next: NextFunction) {
    return users.getJwt(req.user)
      .then((token) => {
        return res.json({
          token: token
        });
      })
      .catch(next);
  }
}
