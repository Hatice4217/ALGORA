import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface VerifyEmailRequest {
  email: string;
}

interface ResendError extends Error {
  cause?: unknown;
  statusCode?: number;
}

// POST /api/auth/verify-email - Send verification email
export async function POST(request: NextRequest) {
  try {
    const body: VerifyEmailRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'E-posta adresi gerekli' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta formatı' },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = Buffer.from(
      JSON.stringify({
        email,
        timestamp: Date.now()
      })
    ).toString('base64');

    // Create verification URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

    // Send verification email
    try {
      const { error } = await resend.emails.send({
        from: 'ALGORA <onay@resend.dev>', // Resend'in test domain'i
        to: [email],
        subject: 'ALGORA - E-posta Adresinizi Onaylayın',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>E-posta Onayı</title>
              <style>
                body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f9fafb;
                }
                .container {
                  background-color: #ffffff;
                  border-radius: 16px;
                  padding: 40px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                .logo {
                  text-align: center;
                  margin-bottom: 30px;
                  font-size: 24px;
                  font-weight: bold;
                  color: #7C3AED;
                }
                .title {
                  font-size: 20px;
                  font-weight: bold;
                  margin-bottom: 20px;
                  color: #1F2937;
                }
                .content {
                  margin-bottom: 30px;
                }
                .button {
                  display: inline-block;
                  padding: 14px 32px;
                  background-color: #7C3AED;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  margin: 20px 0;
                }
                .button:hover {
                  background-color: #6D28D9;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #E5E7EB;
                  text-align: center;
                  font-size: 14px;
                  color: #6B7280;
                }
                .warning {
                  background-color: #FEF3C7;
                  border: 1px solid #FCD34D;
                  border-radius: 8px;
                  padding: 12px;
                  margin: 20px 0;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">ALGORA</div>

                <h1 class="title">E-posta Adresinizi Onaylayın</h1>

                <div class="content">
                  <p>Merhaba,</p>
                  <p>ALGORA'ya hoş geldiniz! Hesabınızı oluşturduğunuz için teşekkür ederiz.</p>

                  <p>E-posta adresinizi onaylamak için aşağıdaki butona tıklayın:</p>

                  <a href="${verificationUrl}" class="button">E-posta Adresimi Onayla</a>

                  <div class="warning">
                    ⚠️ <strong>Önemli:</strong> Bu onay linki 24 saat geçerlidir. Linki tıkladıktan sonra hesabınız aktif hale gelecek ve giriş yapabileceksiniz.
                  </div>

                  <p style="font-size: 14px; color: #6B7280;">
                    Eğer bu buton çalışmazsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:
                  </p>
                  <p style="font-size: 12px; word-break: break-all; color: #6B7280;">
                    ${verificationUrl}
                  </p>
                </div>

                <div class="footer">
                  <p>Bu e-postayı ALGORA sisteminden aldınız.</p>
                  <p>Eğer hesabınızı oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                  <p>© 2026 ALGORA. Tüm hakları saklıdır.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
          ALGORA - E-posta Onayı

          Merhaba,

          ALGORA'ya hoş geldiniz! Hesabınızı oluşturduğunuz için teşekkür ederiz.

          E-posta adresinizi onaylamak için aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:
          ${verificationUrl}

          Bu onay linki 24 saat geçerlidir.

          Eğer hesabınızı oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.

          © 2026 ALGORA. Tüm hakları saklıdır.
        `
      });

      if (error) {
        console.error('[Resend API Error]:', JSON.stringify(error, null, 2));
        console.error('[Resend Error Details]:', {
          name: error.name,
          message: error.message,
          cause: (error as ResendError).cause,
          statusCode: (error as ResendError).statusCode
        });
        return NextResponse.json(
          { error: 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'E-posta onay linki gönderildi. Lütfen e-posta kutunuzu kontrol edin.'
      });

    } catch (resendError) {
      console.error('Resend API error:', resendError);
      return NextResponse.json(
        { error: 'E-posta servisi hatası. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Verify email API error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
