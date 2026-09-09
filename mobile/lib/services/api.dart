import 'package:dio/dio.dart';
const apiBase = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');

class Api {
  static final dio = Dio(BaseOptions(baseUrl: apiBase));
  static Future<List> fetchPosts({String? bounds, String? status}) async {
    final r = await dio.get('/api/posts', queryParameters: {if (bounds!=null) 'bounds': bounds, if (status!=null) 'status': status, 'feed': 'true', 'limit': 50});
    return r.data as List;
  }
  static Future<Map> createPost({required String photoPath, required double lat, required double lng, double? exifLat, double? exifLng, String? roadName, String? roadCondition, String? severity, String? caption, String? timestamp}) async {
    final form = FormData.fromMap({
      'lat': lat, 'lng': lng,
      if (exifLat!=null) 'exifLat': exifLat, if (exifLng!=null) 'exifLng': exifLng,
      if (roadName!=null) 'roadName': roadName,
      if (roadCondition!=null) 'roadCondition': roadCondition,
      if (severity!=null) 'severity': severity,
      if (caption!=null) 'caption': caption,
      'timestamp': timestamp ?? DateTime.now().toIso8601String(),
      'photo': await MultipartFile.fromFile(photoPath, filename: 'capture.jpg'),
    });
    final r = await dio.post('/api/posts', data: form);
    return r.data as Map;
  }

  static Future<List> fetchTimeline(String roadName) async {
    final r = await dio.get('/api/posts/road/${Uri.encodeComponent(roadName)}/timeline');
    return r.data as List;
  }
}
