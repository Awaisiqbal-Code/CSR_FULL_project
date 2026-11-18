from app.media_recovery import can_promote_image_to_voice

def test_only_verified_whatsapp_voice_can_upgrade_an_image_placeholder():
    p=dict(saved_media='image', saved_text='', incoming_media='voice',
           existing_source='true_123456789', incoming_source='true_123456789')
    assert can_promote_image_to_voice(**p)
    assert not can_promote_image_to_voice(**{**p,'incoming_source':'false_123456789'})
    assert not can_promote_image_to_voice(**{**p,'existing_source':'synthetic|key','incoming_source':'synthetic|key'})
    assert not can_promote_image_to_voice(**{**p,'saved_text':'I sent a photo'})
    assert not can_promote_image_to_voice(**{**p,'saved_media':'call'})
    assert not can_promote_image_to_voice(**{**p,'saved_media':'text'})
    assert not can_promote_image_to_voice(**{**p,'incoming_media':'image'})
