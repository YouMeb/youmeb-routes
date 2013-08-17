# youmeb-routes

## 範例 app

[youmeb-routes-example-app](https://github.com/YouMeb/youmeb-routes-example-app)

## 範例

    var Routes = require('youmeb-routes');

    //...

    var app = express();
    
    Routes.create(app)
      // 放 controller 的目錄，可以有多個目錄
      // 目錄下的 index 檔案用來設定一整個目錄
      // 像是 admin 這個目錄我就可以在他的 index 設定 {path: '/admin'}
      // 他會直接套用到 admin 下所有的 controller
      .source(path.join(__dirname, 'controllers'))
      .generate(function (err) {
        if (err) {
          return console.error(err);
        }
        http.createServer(app).listen(app.get('port'), function () {
          console.log('Express server listening on port ' + app.get('port'));
        });
      });
